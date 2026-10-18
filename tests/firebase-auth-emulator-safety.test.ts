import { describe, expect, it } from "vitest";
import { assertSafeFirebaseAuthEmulator } from "@/lib/firebase/emulator-safety";

describe("Firebase Auth Emulator safety", () => {
  it("accepts matching demo projects on loopback", () => {
    expect(assertSafeFirebaseAuthEmulator({ host: "127.0.0.1:9099", projectId: "demo-mwezora-acceptance", serverProjectId: "demo-mwezora-acceptance" })).toEqual({ host: "127.0.0.1:9099", projectId: "demo-mwezora-acceptance" });
  });

  it.each([
    { host: "firebase.example.com:9099", projectId: "demo-mwezora-acceptance" },
    { host: "127.0.0.1:9099", projectId: "production-project" },
    { host: "127.0.0.1:9099/path", projectId: "demo-mwezora-acceptance" },
    { host: "127.0.0.1:9099", projectId: "demo-client", serverProjectId: "demo-server" },
  ])("rejects unsafe or mismatched configuration %#", (configuration) => {
    expect(() => assertSafeFirebaseAuthEmulator(configuration)).toThrow();
  });
});
