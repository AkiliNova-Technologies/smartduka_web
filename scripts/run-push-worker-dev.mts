const productionSignals = [
  process.env.NODE_ENV,
  process.env.VERCEL_ENV,
  process.env.APP_ENV,
  process.env.DEPLOYMENT_ENV,
].map((value) => value?.trim().toLowerCase());

if (productionSignals.includes("production")) {
  console.error("[push-worker-dev] Refusing to run outside a development environment.");
  process.exitCode = 1;
} else {
  let prisma: typeof import("@/lib/prisma/client").prisma | undefined;
  try {
    const [{ prisma: loadedPrisma }, { PushDeliveryOutboxService }] = await Promise.all([
      import("@/lib/prisma/client"),
      import("@/services/push-delivery-outbox"),
    ]);
    prisma = loadedPrisma;
    // The service performs one bounded batch, atomically claims jobs, and uses
    // the same encryption, ownership, retry, and revocation logic as cron.
    const result = await PushDeliveryOutboxService.run();
    console.log(JSON.stringify({
      pushWorker: {
        claimed: result.claimed,
        accepted: result.delivered,
        retried: result.retried,
        permanentlyFailed: result.failed,
        expired: result.skipped,
        disabled: result.disabled,
      },
    }));
  } catch (error) {
    // Never print transport errors: some providers include sensitive endpoint data.
    const name = error instanceof Error ? error.name : "UnknownError";
    console.error("[push-worker-dev] Push batch failed.", { error: name });
    process.exitCode = 1;
  } finally {
    await prisma?.$disconnect();
  }
}
