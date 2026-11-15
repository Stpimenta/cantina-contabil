export type CommandFilter = "all" | "waiting" | "collected";

export interface Command {
  id: string;
  version: number;
  customerName: string;
  note: string;
  createdAt: string;
  collected: boolean;
  paid: boolean;
  items: { name: string; quantity: number; icon: string }[];
}
export interface CommandPage {
  eventId: string;
  eventName: string;
  items: Command[];
  total: number;
  page: number;
  pageSize: number;
  query: string;
  collected: CommandFilter;
}
