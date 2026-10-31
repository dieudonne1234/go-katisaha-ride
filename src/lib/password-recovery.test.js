import { test, expect } from "bun:test";
import { preparePasswordRecovery, passwordValidation } from "./password-recovery";

function fakeAuth() {
  let initialized = 0;
  let verified = 0;
  return {
    initialize: async () => { initialized++; return { error: null }; },
    verifyOtp: async () => { verified++; return { error: null }; },
    getUser: async () => ({ data: { user: { id: "recovery-user" } }, error: null }),
    counts: () => ({ initialized, verified }),
  };
}

test("an implicit recovery callback is initialized once without re-consuming its tokens", async () => {
  const auth = fakeAuth();
  await preparePasswordRecovery(auth, "https://example.test/reset-password#type=recovery&access_token=test&refresh_token=test");
  expect(auth.counts()).toEqual({ initialized: 1, verified: 0 });
});
test("an expired link cannot fall back to an unrelated signed-in account", async () => {
  await expect(preparePasswordRecovery(fakeAuth(), "https://example.test/reset-password#error=access_denied&error_code=otp_expired", true)).rejects.toThrow("expired");
});
test("an ordinary session without a recovery link cannot reset a password", async () => {
  await expect(preparePasswordRecovery(fakeAuth(), "https://example.test/reset-password")).rejects.toThrow("expired");
});
test("token-hash recovery is explicitly verified", async () => {
  const auth = fakeAuth();
  await preparePasswordRecovery(auth, "https://example.test/reset-password?token_hash=test&type=recovery");
  expect(auth.counts().verified).toBe(1);
});
test("sign-in accepts an existing password shorter than signup's minimum", () => {
  expect(passwordValidation("abc123", "signin")).toBeNull();
  expect(passwordValidation("abc123", "reset")).toBe("Password must be at least 8 characters.");
});