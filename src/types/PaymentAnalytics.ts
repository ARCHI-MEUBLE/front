export interface PaymentAnalytics {
  total_revenue: number;
  total_orders: number;
  pending_payments: number;
  successful_payments: number;
  failed_payments: number;
  average_order_value: number;
  revenue_by_month: Array<{ month: string; revenue: number }>;
  payment_methods_distribution: Array<{ method: string; count: number; percentage: number }>;
}

export interface PaymentTransaction {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  amount: number;
  payment_method: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  stripe_payment_intent_id?: string;
  created_at: string;
}

export interface PaymentFilters {
  period: '7d' | '30d' | '90d' | '1y';
}
