/**
 * Jobs Worker stub (Phase 1).
 * Cron, Queues and Workflows land in later phases.
 */
export default {
  async fetch() {
    return Response.json({
      ok: true,
      service: "iwfw-jobs",
      phase: 1,
      message: "Jobs worker stub — no scheduled work yet",
    });
  },
} satisfies ExportedHandler;
