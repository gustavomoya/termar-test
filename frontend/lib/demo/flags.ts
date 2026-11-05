/**
 * Whether the demo-only conflict fixture is enabled.
 *
 * This is the only check other services should use before touching demo code;
 * production builds leave NEXT_PUBLIC_DEMO_CONFLICT unset.
 */
export function isDemoConflictEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_CONFLICT === "true";
}
