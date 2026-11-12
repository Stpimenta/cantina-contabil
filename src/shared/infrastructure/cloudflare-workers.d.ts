// Runtime module exposed by workerd; derive its entrypoint type from the pinned platform types.
declare module "cloudflare:workers" {
  export const WorkerEntrypoint: typeof import("@cloudflare/workers-types").CloudflareWorkersModule.WorkerEntrypoint;
}
