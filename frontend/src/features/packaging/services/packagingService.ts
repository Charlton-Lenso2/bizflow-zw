import { supabase } from "../../../lib/supabase";
import type {
  PackagingBalance,
  PackagingCustomer,
  PackagingDashboardData,
  PackagingTransaction,
  PackagingType,
} from "../types/packaging";

export type PackagingCategory = "bottle" | "crate" | "other";

export type CreatePackagingTypeInput = {
  businessId: string;
  name: string;
  packagingCategory: PackagingCategory;
  isReturnable: boolean;
};

type PackagingTypeRow = {
  id: string;
  name: string;
  packaging_category: string;
  is_active: boolean;
};

function ensureBusinessScope(businessId: string): void {
  if (!businessId) {
    throw new Error("Select a business before accessing packaging management.");
  }
}

export async function createPackagingType({
  businessId,
  name,
  packagingCategory,
  isReturnable,
}: CreatePackagingTypeInput): Promise<PackagingType> {
  ensureBusinessScope(businessId);

  const normalizedName = name.trim();

  if (!normalizedName) {
    throw new Error("Enter a packaging type name.");
  }

  const { data, error } = await supabase
    .from("packaging_types")
    .insert({
      business_id: businessId,
      name: normalizedName,
      packaging_category: packagingCategory,
      is_returnable: isReturnable,
      is_active: true,
    })
    .select("id, name, packaging_category, is_active")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "A packaging type with this name already exists for this business.",
      );
    }

    if (error.code === "42501") {
      throw new Error(
        "You do not have permission to create packaging types. Ask a business owner or administrator.",
      );
    }

    throw new Error(`Failed to create packaging type: ${error.message}`);
  }

  return {
    id: data.id,
    name: data.name,
    packaging_category: data.packaging_category,
  };
}

export async function fetchPackagingDashboardData(
  businessId: string,
): Promise<PackagingDashboardData> {
  ensureBusinessScope(businessId);

  const [
    { data: typeRows, error: typesError },
    { data: customerRows, error: customersError },
    { data: balanceRows, error: balancesError },
    { data: transactionRows, error: transactionsError },
  ] = await Promise.all([
    supabase
      .from("packaging_types")
      .select("id, name, packaging_category, is_active")
      .eq("business_id", businessId)
      .order("name", { ascending: true }),

    supabase
      .from("customers")
      .select("id, full_name, business_name, phone")
      .eq("business_id", businessId)
      .order("full_name", { ascending: true }),

    supabase
      .from("customer_packaging_accounts")
      .select("id, customer_id, packaging_type_id, balance_quantity")
      .eq("business_id", businessId),

    supabase
      .from("packaging_transactions")
      .select(
        "id, customer_id, packaging_type_id, quantity, transaction_type, created_at",
      )
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  if (typesError) {
    throw new Error(`Failed to load packaging types: ${typesError.message}`);
  }

  if (customersError) {
    throw new Error(`Failed to load customers: ${customersError.message}`);
  }

  if (balancesError) {
    throw new Error(
      `Failed to load customer packaging balances: ${balancesError.message}`,
    );
  }

  if (transactionsError) {
    throw new Error(
      `Failed to load packaging transactions: ${transactionsError.message}`,
    );
  }

  const allPackagingTypes = (typeRows ?? []) as PackagingTypeRow[];

  const packagingTypeMap = new Map(
    allPackagingTypes.map((type) => [type.id, type]),
  );

  const packagingTypes: PackagingType[] = allPackagingTypes
    .filter((type) => type.is_active)
    .map((type) => ({
      id: type.id,
      name: type.name,
      packaging_category: type.packaging_category,
    }));

  const balances: PackagingBalance[] = (balanceRows ?? []).map((balance) => {
    const packagingType = packagingTypeMap.get(balance.packaging_type_id);
    const quantity = Number(balance.balance_quantity ?? 0);

    return {
      id: balance.id,
      customer_id: balance.customer_id,
      packaging_type_id: balance.packaging_type_id,
      balance_quantity: quantity,
      packaging_type_name: packagingType?.name ?? null,
      packaging_category: packagingType?.packaging_category ?? null,
      is_owed: quantity > 0,
    };
  });

  const transactions: PackagingTransaction[] = (transactionRows ?? []).map(
    (transaction) => {
      const packagingType = packagingTypeMap.get(transaction.packaging_type_id);

      return {
        id: transaction.id,
        customer_id: transaction.customer_id,
        packaging_type_id: transaction.packaging_type_id,
        packaging_type_name: packagingType?.name ?? null,
        packaging_category: packagingType?.packaging_category ?? null,
        quantity: Number(transaction.quantity ?? 0),
        transaction_type: transaction.transaction_type,
        created_at: transaction.created_at,
      };
    },
  );

  return {
    packagingTypes,
    customers: (customerRows ?? []) as PackagingCustomer[],
    balances,
    transactions,
  };
}
