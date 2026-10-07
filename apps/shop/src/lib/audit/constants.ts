// Admin → Activity (pure: also used by the Guide).
export const ACTIVITY_AREAS = ["orders", "customers", "discounts", "catalog", "email", "inquiries", "disputes", "partners", "payouts", "alerts"] as const;
export type ActivityArea = (typeof ACTIVITY_AREAS)[number];
export const AREA_LABEL: Record<ActivityArea, string> = {
  orders: "Orders", customers: "Customers", discounts: "Discounts", catalog: "Catalog", email: "Email", inquiries: "Inquiries",
  disputes: "Disputes", partners: "Partners", payouts: "Payouts", alerts: "Today & alerts",
};
export const ACTIVITY_PAGE = 50;
