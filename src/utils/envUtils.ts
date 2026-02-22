/**
 * Reads an environment variable from `import.meta.env` (Astro/Vite)
 * with a fallback to `process.env` for non-Vite environments.
 *
 * @param variable     - The name of the environment variable.
 * @param defaultValue - Optional fallback when the variable is not set.
 * @returns The value of the environment variable, or the default.
 * @throws {Error} When the variable is not set and no default is provided.
 */
export function getEnvVariable(
  variable: string,
  defaultValue?: string,
): string {
  const value = (import.meta.env as Record<string, string | undefined>)[variable]
    ?? process.env[variable];

  if (value !== undefined && value !== "") {
    return value;
  }

  if (defaultValue !== undefined) {
    return defaultValue;
  }

  throw new Error(
    `Required environment variable "${variable}" is not set.`,
  );
}
