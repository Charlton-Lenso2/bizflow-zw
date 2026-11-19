export type PackagingType = {
  id: string;
  name: string;
  packaging_category: string | null;
};

export type PackagingCustomer = {
  id: string;
  full_name: string | null;
  business_name: string | null;
  phone: string | null;
};

export type PackagingBalance = {
  id: string;
  customer_id: string;
  packaging_type_id: string;
  balance_quantity: number;
  packaging_type_name: string | null;
  packaging_category: string | null;
  is_owed: boolean;
};

export type PackagingTransaction = {
  id: string;
  customer_id: string | null;
  packaging_type_id: string;
  packaging_type_name: string | null;
  packaging_category: string | null;
  quantity: number;
  transaction_type: string;
  created_at: string;
};

export type PackagingDashboardData = {
  packagingTypes: PackagingType[];
  customers: PackagingCustomer[];
  balances: PackagingBalance[];
  transactions: PackagingTransaction[];
};
