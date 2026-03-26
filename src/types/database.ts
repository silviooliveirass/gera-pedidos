export type UserRole = "manager" | "cd_user";

export interface DistributionCenter {
  id: string;
  code: string;
  name: string;
}

export interface Profile {
  id: string;
  role: UserRole;
  distribution_center_id: string | null;
  full_name: string;
}

export interface DailyOrder {
  id: string;
  distribution_center_id: string;
  order_date: string;
  quantity: number;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}
