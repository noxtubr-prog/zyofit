// Canonical order statuses — must match the database CHECK constraint on `orders.status`.
export const ORDER_STATUSES = ["placed", "stitching", "ready", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Order Placed",
  stitching: "Stitching",
  ready: "Ready",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const isValidOrderStatus = (s: string): s is OrderStatus =>
  (ORDER_STATUSES as readonly string[]).includes(s);
