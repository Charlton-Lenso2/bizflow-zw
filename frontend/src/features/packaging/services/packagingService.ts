import { supabase } from "../../../lib/supabase";
import type {
  PackagingBalance,
  PackagingCustomer,
  PackagingDashboardData,
  PackagingTransaction,
  PackagingType,
} from "../types/packaging";

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
