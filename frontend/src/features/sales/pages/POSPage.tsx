import { CustomSelect } from "../../../components/ui/CustomSelect";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  CreditCard,
  Lock,
  ReceiptText,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { Alert } from "../../../components/ui/Alert";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { useAuth } from "../../auth/hooks/useAuth";
import { useBusiness } from "../../business/hooks/useActiveBusiness";
import type {
  CustomerRecord,
  PackagingDepositEntry,
  SaleCartItem,
  SaleVariantOption,
} from "../types/sales";
import {
  buildPackagingReturnEntries,
  canCompleteSaleWithException,
  completeSale,
  createDraftSale,
  fetchCustomersForBusiness,
  fetchProductVariantsForSale,
  fetchWalkInCustomer,
  formatCurrency,
  getCustomerDisplayName,
  insertSaleItems,
} from "../services/salesService";

const PAYMENT_OPTIONS = ["cash", "bank_transfer", "mobile_money"];

type POSStatus = {
  type: "success" | "error" | "info";
  text: string;
};

export function POSPage() {
  const {
    activeBusinessId,
    businesses,
    setBusinessSwitchLocked,
    isBusinessSwitchLocked,
  } = useBusiness();

  const { user } = useAuth();

  const [catalogue, setCatalogue] = useState<SaleVariantOption[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<SaleCartItem[]>([]);
  const [packagingReturns, setPackagingReturns] = useState<
    Record<string, number>
  >({});
  const [exceptionMode, setExceptionMode] = useState<"packaging_owed" | "">("");
  const [exceptionReason, setExceptionReason] = useState("");
  const [initialPayment, setInitialPayment] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<POSStatus | null>(null);

  const isSubmittingRef = useRef(false);

  const filteredCatalogue = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return catalogue;
    }

    return catalogue.filter((item) => {
      const haystack = [
        item.product_name,
        item.brand,
        item.variant_name,
        item.flavour,
        item.bottle_size_ml ? `${item.bottle_size_ml}ml` : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [catalogue, searchTerm]);

  useEffect(() => {
    if (!activeBusinessId) {
      return;
    }

    let isMounted = true;

    const loadPosData = async () => {
      setIsLoading(true);

      // Never carry checkout data from one workspace into another.
      setCatalogue([]);
      setCustomers([]);
      setSelectedCustomerId(null);
      setSearchTerm("");
      setCart([]);
      setPackagingReturns({});
      setExceptionMode("");
      setExceptionReason("");
      setInitialPayment(0);
      setPaymentMethod("cash");
      setStatus(null);

      try {
        const [nextVariants, fetchedCustomers] = await Promise.all([
          fetchProductVariantsForSale(activeBusinessId),
          fetchCustomersForBusiness(activeBusinessId),
        ]);

        if (!isMounted) return;

        const preferredWalkIn = await fetchWalkInCustomer(activeBusinessId);

        if (!isMounted) return;

        const nextCustomers =
          preferredWalkIn &&
          !fetchedCustomers.some(
            (customer) => customer.id === preferredWalkIn.id,
          )
            ? [...fetchedCustomers, preferredWalkIn]
            : fetchedCustomers;

        setCatalogue(nextVariants);
        setCustomers(nextCustomers);
        setSelectedCustomerId(
          preferredWalkIn?.id ?? nextCustomers[0]?.id ?? null,
        );
      } catch (error) {
        console.error("Failed to load POS data", error);

        if (isMounted) {
          setStatus({
            type: "error",
            text:
              error instanceof Error
                ? error.message
                : "The sales catalogue and customer list could not be loaded.",
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadPosData();

    return () => {
      isMounted = false;
    };
  }, [activeBusinessId]);

  // Keep the shared workspace lock while a checkout request is in progress.
  useEffect(() => {
    return () => {
      setBusinessSwitchLocked(false);
    };
  }, [setBusinessSwitchLocked]);

  const cartByVariant = useMemo(() => {
    return new Map(catalogue.map((item) => [item.id, item]));
  }, [catalogue]);

  const packagingSummary = useMemo(() => {
    const totals = new Map<
      string,
      {
        packaging_type_id: string;
        packaging_type_name: string | null;
        packaging_category: string | null;
        quantity_required: number;
      }
    >();

    for (const item of cart) {
      const variant = cartByVariant.get(item.variantId);

      if (!variant) continue;

      for (const requirement of variant.packaging_requirements) {
        const existing = totals.get(requirement.packaging_type_id) ?? {
          packaging_type_id: requirement.packaging_type_id,
          packaging_type_name: requirement.packaging_type_name,
          packaging_category: requirement.packaging_category,
          quantity_required: 0,
        };

        existing.quantity_required +=
          requirement.quantity_required * item.quantity;

        totals.set(requirement.packaging_type_id, existing);
      }
    }

    return Array.from(totals.values());
  }, [cart, cartByVariant]);

  const minicartTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => {
      const price = Number(item.unitPrice);
      const quantity = Number(item.quantity);

      if (!Number.isFinite(price) || !Number.isFinite(quantity)) {
        return sum;
      }

      return sum + Math.max(price, 0) * Math.max(quantity, 0);
    }, 0);

    const discount = cart.reduce((sum, item) => {
      const lineSubtotal = Math.max(item.unitPrice * item.quantity, 0);
      const lineDiscount = Number.isFinite(item.discount)
        ? Math.min(Math.max(item.discount, 0), lineSubtotal)
        : 0;

      return sum + lineDiscount;
    }, 0);

    return {
      subtotal,
      discount,
      total: Math.max(subtotal - discount, 0),
    };
  }, [cart]);

  const shortageCount = useMemo(() => {
    return packagingSummary.reduce((sum, requirement) => {
      const returned = Number(
        packagingReturns[requirement.packaging_type_id] ??
          requirement.quantity_required,
      );

      return sum + (requirement.quantity_required > returned ? 1 : 0);
    }, 0);
  }, [packagingReturns, packagingSummary]);

  const selectedCustomer =
    customers.find((customer) => customer.id === selectedCustomerId) ?? null;

  const addToCart = (variant: SaleVariantOption) => {
    if (isSubmittingRef.current) return;

    const availableStock = Number(variant.stock_on_hand);

    if (!Number.isFinite(availableStock) || availableStock <= 0) {
      setStatus({
        type: "error",
        text: "This variant has no available stock.",
      });
      return;
    }

    const price = Number(variant.current_price);

    if (!Number.isFinite(price) || price < 0) {
      setStatus({
        type: "error",
        text: "This variant has an invalid selling price. Update its price before selling.",
      });
      return;
    }

    const existing = cart.find((item) => item.variantId === variant.id);
    const currentQuantity = existing?.quantity ?? 0;
    const nextQuantity = currentQuantity + 1;

    if (nextQuantity > availableStock) {
      setStatus({
        type: "error",
        text: `Only ${availableStock} crates are available for this variant.`,
      });
      return;
    }

    if (existing) {
      setCart((current) =>
        current.map((item) =>
          item.variantId === variant.id
            ? { ...item, quantity: nextQuantity }
            : item,
        ),
      );
      setStatus(null);
      return;
    }

    setCart((current) => [
      ...current,
      {
        variantId: variant.id,
        productName: variant.product_name ?? "Unknown product",
        variantLabel: [
          variant.variant_name,
          variant.flavour,
          variant.bottle_size_ml ? `${variant.bottle_size_ml}ml` : null,
        ]
          .filter(Boolean)
          .join(" · "),
        unitPrice: price,
        quantity: 1,
        discount: 0,
        stockOnHand: availableStock,
      },
    ]);

    setStatus(null);
  };

  const updateCartQuantity = (variantId: string, delta: number) => {
    if (isSubmittingRef.current) return;

    const existing = cart.find((item) => item.variantId === variantId);

    if (!existing) return;

    const nextQuantity = existing.quantity + delta;

    if (nextQuantity > existing.stockOnHand) {
      setStatus({
        type: "error",
        text: `Only ${existing.stockOnHand} crates are available for this variant.`,
      });
      return;
    }

    setCart((current) =>
      current
        .map((item) =>
          item.variantId === variantId
            ? { ...item, quantity: Math.max(item.quantity + delta, 0) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );

    setStatus(null);
  };

  const updateCartDiscount = (variantId: string, nextDiscount: number) => {
    if (isSubmittingRef.current) return;

    setCart((current) =>
      current.map((item) => {
        if (item.variantId !== variantId) return item;

        const lineSubtotal = Math.max(item.unitPrice * item.quantity, 0);
        const safeDiscount = Number.isFinite(nextDiscount)
          ? Math.min(Math.max(nextDiscount, 0), lineSubtotal)
          : 0;

        return { ...item, discount: safeDiscount };
      }),
    );
  };

  const removeFromCart = (variantId: string) => {
    if (isSubmittingRef.current) return;

    setCart((current) =>
      current.filter((item) => item.variantId !== variantId),
    );
  };

  const resetCheckout = () => {
    if (isSubmittingRef.current) return;

    setCart([]);
    setInitialPayment(0);
    setPaymentMethod("cash");
    setExceptionReason("");
    setExceptionMode("");
    setPackagingReturns({});
    setStatus(null);
  };

  const handleSubmit = async () => {
    // A ref prevents two rapid clicks before React can update disabled state.
    if (isSubmittingRef.current) return;

    const businessId = activeBusinessId;
    const customerId = selectedCustomerId;
    const cartSnapshot = cart.map((item) => ({ ...item }));
    const paymentAmount = Number(initialPayment);
    const saleTotal = minicartTotals.total;

    if (!businessId) {
      setStatus({
        type: "error",
        text: "Select a business before completing a sale.",
      });
      return;
    }

    if (cartSnapshot.length === 0) {
      setStatus({
        type: "error",
        text: "Add at least one product to the cart.",
      });
      return;
    }

    if (!customerId) {
      setStatus({
        type: "error",
        text: "Select a registered customer or use the Walk-in Customer option.",
      });
      return;
    }

    if (!user?.id) {
      setStatus({
        type: "error",
        text: "You must be signed in to complete a sale.",
      });
      return;
    }

    if (
      cartSnapshot.some(
        (item) =>
          !Number.isInteger(item.quantity) ||
          item.quantity <= 0 ||
          !Number.isFinite(item.unitPrice) ||
          item.unitPrice < 0 ||
          !Number.isFinite(item.discount) ||
          item.discount < 0 ||
          item.discount > item.unitPrice * item.quantity ||
          item.quantity > item.stockOnHand,
      )
    ) {
      setStatus({
        type: "error",
        text: "One or more cart items have an invalid quantity, price, discount, or stock level.",
      });
      return;
    }

    if (
      !Number.isFinite(paymentAmount) ||
      paymentAmount < 0 ||
      paymentAmount > saleTotal
    ) {
      setStatus({
        type: "error",
        text: "The initial payment must be between zero and the sale total.",
      });
      return;
    }

    if (paymentAmount > 0 && !PAYMENT_OPTIONS.includes(paymentMethod)) {
      setStatus({
        type: "error",
        text: "Choose a valid payment method when an initial payment is entered.",
      });
      return;
    }

    const packagingRules = packagingSummary;

    const invalidPackagingReturn = packagingRules.some((requirement) => {
      const returned = Number(
        packagingReturns[requirement.packaging_type_id] ??
          requirement.quantity_required,
      );

      return (
        !Number.isFinite(returned) ||
        returned < 0 ||
        returned > requirement.quantity_required
      );
    });

    if (invalidPackagingReturn) {
      setStatus({
        type: "error",
        text: "Packaging returns must be valid quantities between zero and the required amount.",
      });
      return;
    }

    const shortages = packagingRules.filter((requirement) => {
      const returned = Number(
        packagingReturns[requirement.packaging_type_id] ??
          requirement.quantity_required,
      );

      return requirement.quantity_required > returned;
    });

    if (shortages.length > 0 && !exceptionMode) {
      setStatus({
        type: "error",
        text: "A packaging shortage requires an explicit exception mode.",
      });
      return;
    }

    if (shortages.length > 0 && !exceptionReason.trim()) {
      setStatus({
        type: "error",
        text: "Explain the packaging shortage before completing the sale.",
      });
      return;
    }

    const currentMembership =
      businesses.find((membership) => membership.business_id === businessId) ??
      null;

    const isAuthorizedForException = canCompleteSaleWithException(
      currentMembership?.role,
    );

    if (shortages.length > 0 && !isAuthorizedForException) {
      setStatus({
        type: "error",
        text: "Packaging exceptions require owner, administrator, or manager authorization.",
      });
      return;
    }

    const packagingReturned = buildPackagingReturnEntries(
      packagingRules.map((entry) => ({
        packaging_type_id: entry.packaging_type_id,
        quantity_required: entry.quantity_required,
      })),
      packagingReturns,
    );

    // Deposits remain disabled until the business has configured deposit rates.
    const deposits: PackagingDepositEntry[] = [];

    let createdSaleId: string | null = null;

    // Lock switching synchronously before starting any asynchronous request.
    isSubmittingRef.current = true;
    setBusinessSwitchLocked(true);
    setIsSubmitting(true);
    setStatus(null);

    try {
      const sale = await createDraftSale({
        businessId,
        customerId,
        subtotal: saleTotal + minicartTotals.discount - minicartTotals.discount,
        discountAmount: minicartTotals.discount,
        totalAmount: saleTotal,
        createdBy: user.id,
      });

      createdSaleId = sale.id;

      await insertSaleItems(
        businessId,
        sale.id,
        cartSnapshot.map((item) => {
          const price = Number(item.unitPrice);
          const quantity = Number(item.quantity);
          const lineSubtotal = price * quantity;
          const lineDiscount = Math.min(item.discount, lineSubtotal);
          const lineTotal = Math.max(lineSubtotal - lineDiscount, 0);

          return {
            product_variant_id: item.variantId,
            product_name_snapshot: item.productName,
            variant_name_snapshot: item.variantLabel,
            quantity_crates: quantity,
            unit_price: price,
            discount_amount: lineDiscount,
            line_total: lineTotal,
          };
        }),
      );

      const rpcResult = await completeSale({
        saleId: sale.id,
        packagingReturned,
        exceptionMode: shortages.length > 0 ? exceptionMode : null,
        exceptionReason: shortages.length > 0 ? exceptionReason.trim() : null,
        deposits,
        initialPayment: paymentAmount,
        paymentMethod: paymentAmount > 0 ? paymentMethod : null,
      });

      setStatus({
        type: "success",
        text: `Sale ${rpcResult.sale_number ?? sale.sale_number ?? "completed"} was completed successfully.`,
      });

      setCart([]);
      setInitialPayment(0);
      setPaymentMethod("cash");
      setExceptionReason("");
      setExceptionMode("");
      setPackagingReturns({});
    } catch (error) {
      console.error("Failed to complete sale", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "The sale could not be completed.";

      setStatus({
        type: "error",
        text: createdSaleId
          ? `${errorMessage} A draft sale may already exist. Check Sales history before retrying to avoid creating a duplicate.`
          : errorMessage,
      });
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setBusinessSwitchLocked(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Point of sale
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
            Sales checkout
          </h1>
          {isBusinessSwitchLocked ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
              <Lock className="h-3.5 w-3.5" />
              Workspace switching is locked while this sale is processing.
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/sales"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            Sales history
          </Link>
        </div>
      </div>

      {status ? (
        <Alert
          variant={
            status.type === "error"
              ? "error"
              : status.type === "success"
                ? "success"
                : "info"
          }
          title={
            status.type === "error"
              ? "Action required"
              : status.type === "success"
                ? "Sale completed"
                : "POS update"
          }
        >
          {status.text}
        </Alert>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
        <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                aria-label="Search products"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search products, flavour, bottle size"
                className="pl-9"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
              Loading product catalogue…
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filteredCatalogue.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-300 md:col-span-2">
                  No active variants are available for sale in this business.
                </div>
              ) : (
                filteredCatalogue.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    disabled={isSubmitting || variant.stock_on_hand <= 0}
                    onClick={() => addToCart(variant)}
                    className="flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-brand-primary hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-slate-500"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {variant.product_name ?? "Unknown product"}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {variant.brand ?? "No brand"}
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                        {variant.stock_on_hand ?? 0} crates
                      </span>
                    </div>

                    <div className="mt-4 space-y-1 text-sm text-slate-700 dark:text-slate-200">
                      <p>
                        {variant.variant_name ?? "Variant"} ·{" "}
                        {variant.flavour ?? "No flavour"}
                      </p>
                      <p>
                        {variant.bottle_size_ml
                          ? `${variant.bottle_size_ml} ml`
                          : "Bottle size not set"}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
                          Price
                        </p>
                        <p className="text-base font-semibold text-slate-900 dark:text-white">
                          {formatCurrency(variant.current_price)}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white dark:bg-slate-100 dark:text-slate-900">
                        <ShoppingCart className="h-3.5 w-3.5" />
                        Add
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </section>

        <aside className="space-y-6 rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <ShoppingCart className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Cart
              </p>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Current sale
              </h2>
            </div>
          </div>

          <div className="space-y-3">
            {cart.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-300">
                No items added yet.
              </div>
            ) : (
              cart.map((item) => {
                const lineSubtotal = item.unitPrice * item.quantity;
                const lineDiscount = Math.min(
                  Math.max(item.discount, 0),
                  lineSubtotal,
                );
                const lineTotal = Math.max(lineSubtotal - lineDiscount, 0);

                return (
                  <div
                    key={item.variantId}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {item.productName}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {item.variantLabel}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => removeFromCart(item.variantId)}
                        className="rounded-lg p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-50 dark:hover:bg-slate-700"
                        aria-label={`Remove ${item.productName}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => updateCartQuantity(item.variantId, -1)}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-sm disabled:opacity-50 dark:border-slate-600"
                      >
                        -
                      </button>
                      <span className="min-w-8 text-center text-sm font-medium text-slate-900 dark:text-white">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        disabled={
                          isSubmitting || item.quantity >= item.stockOnHand
                        }
                        onClick={() => updateCartQuantity(item.variantId, 1)}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600"
                      >
                        +
                      </button>
                      <span className="ml-auto text-xs text-slate-500">
                        Stock: {item.stockOnHand}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-[1fr_auto] gap-2 text-sm">
                      <span className="text-slate-500">Discount</span>
                      <input
                        type="number"
                        min={0}
                        max={lineSubtotal}
                        step="0.01"
                        value={item.discount}
                        disabled={isSubmitting}
                        onChange={(event) =>
                          updateCartDiscount(
                            item.variantId,
                            Number(event.target.value),
                          )
                        }
                        className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1 text-right text-slate-900 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-slate-500">Line total</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(lineTotal)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-700">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Customer
              </span>
              <CustomSelect
  value={selectedCustomerId ?? ""}
  disabled={isSubmitting}
  onChange={(value) => setSelectedCustomerId(value || null)}
  placeholder="Select a customer"
  searchable
  searchPlaceholder="Search customers..."
  options={[
    { value: "", label: "Select a customer" },
    ...customers.map((customer) => ({
      value: customer.id,
      label: getCustomerDisplayName(customer),
    })),
  ]}
/>
            </label>

            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/40">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-500">Customer</span>
                <span className="text-right font-medium text-slate-900 dark:text-white">
                  {selectedCustomer
                    ? getCustomerDisplayName(selectedCustomer)
                    : "No customer selected"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span>{formatCurrency(minicartTotals.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Discount</span>
                <span>{formatCurrency(minicartTotals.discount)}</span>
              </div>
              <div className="flex items-center justify-between text-base font-semibold text-slate-900 dark:text-white">
                <span>Total</span>
                <span>{formatCurrency(minicartTotals.total)}</span>
              </div>
            </div>

            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                <ReceiptText className="h-4 w-4" />
                Packaging return
              </div>

              {packagingSummary.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No packaging requirements for this cart.
                </p>
              ) : (
                packagingSummary.map((requirement) => {
                  const returned = Number(
                    packagingReturns[requirement.packaging_type_id] ??
                      requirement.quantity_required,
                  );
                  const shortage = Math.max(
                    requirement.quantity_required - returned,
                    0,
                  );

                  return (
                    <div
                      key={requirement.packaging_type_id}
                      className="space-y-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-800 dark:text-slate-100">
                          {requirement.packaging_type_name ?? "Packaging"}
                        </span>
                        <span className="text-slate-500">
                          Required {requirement.quantity_required}
                        </span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={requirement.quantity_required}
                        step="1"
                        value={returned}
                        disabled={isSubmitting}
                        onChange={(event) => {
                          const rawValue = event.target.value;
                          const parsedValue =
                            rawValue === "" ? 0 : Number(rawValue);

                          const safeValue = Number.isFinite(parsedValue)
                            ? Math.min(
                                Math.max(parsedValue, 0),
                                requirement.quantity_required,
                              )
                            : 0;

                          setPackagingReturns((current) => ({
                            ...current,
                            [requirement.packaging_type_id]: safeValue,
                          }));
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                      {shortage > 0 ? (
                        <p className="text-[11px] text-amber-700">
                          Shortage: {shortage} crates. Select an exception mode
                          to continue.
                        </p>
                      ) : null}
                    </div>
                  );
                })
              )}

              {shortageCount > 0 ? (
                <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-600/30 dark:bg-amber-950/20 dark:text-amber-200">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em]">
                      Exception mode
                    </span>
                    <CustomSelect
  value={exceptionMode}
  disabled={isSubmitting}
  onChange={(value) =>
    setExceptionMode(value as "packaging_owed" | "")
  }
  variant="warning"
  placeholder="Select exception"
  options={[
    { value: "", label: "Select exception" },
    { value: "packaging_owed", label: "Packaging owed" },
  ]}
/>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em]">
                      Reason
                    </span>
                    <textarea
                      value={exceptionReason}
                      disabled={isSubmitting}
                      onChange={(event) =>
                        setExceptionReason(event.target.value)
                      }
                      rows={3}
                      className="w-full rounded-lg border border-amber-300 bg-white px-2 py-2 text-sm text-amber-900 disabled:opacity-50 dark:border-amber-600 dark:bg-slate-900 dark:text-amber-100"
                    />
                  </label>
                </div>
              ) : null}
            </div>

            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                <CreditCard className="h-4 w-4" />
                Payment details
              </div>

              <label className="block text-sm text-slate-700 dark:text-slate-200">
                <span className="mb-1 block">Initial payment</span>
                <input
                  type="number"
                  min={0}
                  max={minicartTotals.total}
                  step="0.01"
                  value={initialPayment}
                  disabled={isSubmitting}
                  onChange={(event) => {
                    const rawValue = event.target.value;
                    const parsedValue = rawValue === "" ? 0 : Number(rawValue);

                    setInitialPayment(
                      Number.isFinite(parsedValue)
                        ? Math.max(parsedValue, 0)
                        : 0,
                    );
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </label>

              <label className="block text-sm text-slate-700 dark:text-slate-200">
                <span className="mb-1 block">Payment method</span>
                <CustomSelect
  value={paymentMethod}
  disabled={isSubmitting}
  onChange={setPaymentMethod}
  options={PAYMENT_OPTIONS.map((option) => ({
    value: option,
    label: option.replace(/_/g, " "),
  }))}
/>
              </label>

              <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>Outstanding balance</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {formatCurrency(
                    Math.max(minicartTotals.total - initialPayment, 0),
                  )}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                disabled={isSubmitting}
                onClick={resetCheckout}
              >
                Clear
              </Button>
              <Button
                disabled={isSubmitting || isLoading || !activeBusinessId}
                className="flex-1"
                onClick={handleSubmit}
              >
                {isSubmitting ? "Completing…" : "Complete sale"}
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
