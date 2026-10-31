// Only these locally authored messages may be shown by the CI entrypoint.
// Unexpected provider/JSON/runtime errors must not leak their payloads.
export class ReleaseError extends Error {}
