import type {
  Command,
  CommandPage,
} from "@/server/canteen/models/command.model";
export interface WindowChange {
  order: Command | null;
  window: { ids: string[]; total: number; page: number };
}
export async function reconcileCommandWindow(
  current: CommandPage,
  change: WindowChange,
  load: (id: string) => Promise<Command | null>,
) {
  const known = new Map(current.items.map((i) => [i.id, i]));
  if (
    change.order &&
    change.order.version >= (known.get(change.order.id)?.version ?? 0)
  )
    known.set(change.order.id, change.order);
  const items: Command[] = [];
  for (const id of change.window.ids) {
    const item = known.get(id) ?? (await load(id));
    if (item) items.push(item);
  }
  return {
    ...current,
    items,
    total: change.window.total,
    page: change.window.page,
  };
}
