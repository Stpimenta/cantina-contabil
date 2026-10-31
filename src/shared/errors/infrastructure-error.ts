type InfrastructureDetails = Record<string, string | number>;
type InfrastructureOptions = ErrorOptions & { details?: InfrastructureDetails };

export class InfrastructureError extends Error {
  public readonly details?: InfrastructureDetails;
  constructor(
    message: string,
    public readonly service: string,
    public readonly status?: number,
    options?: InfrastructureOptions,
  ) {
    super(message, options);
    this.name = "InfrastructureError";
    this.details = options?.details;
  }
}
