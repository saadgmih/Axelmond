/** Execute an integration test file via tsx (npm run test:security-runtime). */
export async function runtimeTest(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (err) {
    console.error(`✗ ${name}`);
    throw err;
  }
}
