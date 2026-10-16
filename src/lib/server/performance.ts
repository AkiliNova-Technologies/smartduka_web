import "server-only";

export async function measureServerOperation<T>(name: string, operation: () => Promise<T>): Promise<T> {
  const startedAt = performance.now();
  try {
    return await operation();
  } finally {
    console.info("[Server Timing]", {
      operation: name,
      durationMs: Math.round(performance.now() - startedAt),
    });
  }
}
