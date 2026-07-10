type Messages = Record<string, unknown>;

export function createTranslator(messages: Messages) {
  return function t(
    key: string,
    vars?: Record<string, string | number>,
  ): string {
    const keys = key.split(".");
    let value: unknown = messages;

    for (const part of keys) {
      if (value && typeof value === "object" && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return key;
      }
    }

    if (typeof value !== "string") {
      return key;
    }

    if (!vars) {
      return value;
    }

    return Object.entries(vars).reduce(
      (result, [name, replacement]) =>
        result.replaceAll(`{${name}}`, String(replacement)),
      value,
    );
  };
}

export type Translator = ReturnType<typeof createTranslator>;
