import type { BusinessFailure } from "./business-failure";

export class BusinessError extends Error {
  constructor(public readonly details: BusinessFailure) {
    super(details.code);
    this.name = "BusinessError";
  }
}

export function throwBusinessError(details: BusinessFailure): never {
  throw new BusinessError(details);
}
