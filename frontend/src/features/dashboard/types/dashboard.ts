export type ActivityType = 'sale' | 'inventory' | 'packaging'

export type DashboardActivityItem = {
  id: string
  type: ActivityType
  title: string
  description: string
  timestamp: string | null
  amountText?: string
}

export type DashboardSummary = {
  productCount: number
  activeVariantCount: number
  stockOnHand: number | null
  completedSalesCount: number
  recentActivity: DashboardActivityItem[]
  stockSource: 'projection' | 'unavailable'
}
