export type FirebaseEmulatorConfiguration = {
  host: string;
  projectId: string;
  serverProjectId?: string;
};

/** Firebase reserves demo-* projects for emulator-only work with no live resources. */
export function assertSafeFirebaseAuthEmulator(config: FirebaseEmulatorConfiguration) {
  const target = new URL(`http://${config.host}`);
  if (!["127.0.0.1", "localhost", "::1"].includes(target.hostname) || target.pathname !== "/" || target.username || target.password) {
    throw new Error("Firebase Auth Emulator must use an uncredentialed loopback host.");
  }
  if (!config.projectId.startsWith("demo-")) throw new Error("Firebase Auth Emulator requires a demo-* project ID.");
  if (config.serverProjectId && config.serverProjectId !== config.projectId) throw new Error("Firebase client and server project IDs must match in emulator mode.");
  return { host: target.host, projectId: config.projectId };
}
