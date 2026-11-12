import type { CommandIdentity } from "../models/command-actor.model";
import type { GetCommandUseCase } from "./get-command.use-case";
import type { ListCommandsUseCase } from "./list-commands.use-case";
export class GetCommandWindowUseCase {
  constructor(
    private readonly get: GetCommandUseCase,
    private readonly list: ListCommandsUseCase,
  ) {}
  async execute(
    identity: CommandIdentity,
    eventId: unknown,
    id: unknown,
    input: unknown,
  ) {
    const order = await this.get.execute(identity, eventId, id);
    const page = await this.list.execute(identity, eventId, input);
    return {
      order,
      window: {
        ids: page.items.map((i) => i.id),
        total: page.total,
        page: page.page,
      },
    };
  }
}
