import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";

const PORT = 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const LOG_FILE_PATH = process.env.FORGOT_PASSWORD_LOG_PATH || path.join(process.cwd(), "tmp", "forgot-password-task.log");

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("=== Forgot Password Integration Flow Verification ===");

  // 1. Request a verification code
  console.log("Step 1: Requesting code for verification@gmail.com...");
  const forgotResponse = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "verification@gmail.com" }),
  });

  const forgotData = await forgotResponse.json();
  console.log("Response:", forgotData);
  assert.equal(forgotResponse.status, 200);
  assert.match(forgotData.message, /Si un compte Axelmond Research Labs existe/);

  // 2. Provide the reset code via TEST_RESET_CODE (plaintext codes are no longer logged)
  console.log("Step 2: Reading reset code from TEST_RESET_CODE...");
  const code = process.env.TEST_RESET_CODE?.trim() || null;
  if (!code) {
    throw new Error("Set TEST_RESET_CODE to the emailed reset code — plaintext codes are no longer written to logs.");
  }
  console.log("✅ Using verification code from TEST_RESET_CODE");

  // 3. Reset the password using the code
  console.log("Step 3: Resetting password with the verification code...");
  const resetResponse = await fetch(`${BASE_URL}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "verification@gmail.com",
      code,
      newPassword: "newpassword456",
    }),
  });

  const resetData = await resetResponse.json();
  console.log("Response:", resetData);
  assert.equal(resetResponse.status, 200);

  // 4. Test login with the new password
  console.log("Step 4: Attempting login with new password...");
  const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "verification@gmail.com",
      password: "newpassword456",
      role: "STUDENT",
    }),
  });

  const loginData = await loginResponse.json();
  console.log("Response Status:", loginResponse.status);
  assert.equal(loginResponse.status, 200);
  assert.ok(loginData.token, "Login did not return token");
  console.log("✅ Successfully logged in with the new password!");
  
  console.log("=== Integration Verification Passed Successfully! ===");
}

main().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
