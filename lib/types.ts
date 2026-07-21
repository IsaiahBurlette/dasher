export interface DashEntry {
  id: string;
  /** ISO date (YYYY-MM-DD) the dash took place on */
  date: string;
  /** 24h "HH:MM" */
  startTime: string;
  /** 24h "HH:MM" */
  endTime: string;
  /** total scheduled/on-dash time, in minutes */
  dashTimeMinutes: number;
  /** active (in-delivery) time, in minutes */
  activeTimeMinutes: number;
  /** total earnings for the dash, in dollars */
  earnings: number;
  /** number of deliveries, if known */
  deliveries: number | null;
  /** user-entered miles driven */
  mileage: number | null;
  notes: string;
  /** original filename of the uploaded screenshot, for reference only */
  sourceFileName: string | null;
  /** when this record was added to the app */
  createdAt: string;
}

export type NewDashEntryInput = Omit<DashEntry, "id" | "createdAt">;

export interface ExtractedDashData {
  startTime: string | null;
  endTime: string | null;
  dashTimeMinutes: number | null;
  activeTimeMinutes: number | null;
  earnings: number | null;
  deliveries: number | null;
  warning?: string;
}
