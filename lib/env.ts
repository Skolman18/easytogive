/**
 * Centralized env access. Use getRequiredEnv in app code that must have the var;
 * use getOptionalEnv when the var is optional (e.g. feature flags).
 * Avoids passing undefined into SDKs and gives a clear error at runtime.
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === "") {
    throw new Error(`[EasyToGive] Missing required environment variable: ${key}`);
  }
  return value;
}

function getOptionalEnv(key: string): string | undefined {
  const value = process.env[key];
  return value === "" ? undefined : value;
}

export { getRequiredEnv, getOptionalEnv };
