type NextIntlProviderPayload = {
  locale: unknown;
  messages: unknown;
};

type ClientReferenceManifest = {
  clientModules?: Record<string, { id?: number | string }>;
};

function parseManifest(source: string): ClientReferenceManifest {
  const assignment = source.match(
    /^globalThis\.__RSC_MANIFEST\[("(?:\\.|[^"\\])*")\]\s*=\s*(\{.*\});?\s*$/mu,
  );
  if (!assignment) {
    throw new Error("client reference manifest has no indexed assignment");
  }
  const serialized = assignment[2];
  try {
    return JSON.parse(serialized) as ClientReferenceManifest;
  } catch (error) {
    throw new Error(
      `client reference manifest is not valid JSON: ${String(error)}`,
    );
  }
}

function readNextIntlProviderModuleId(manifestSource: string): string {
  const manifest = parseManifest(manifestSource);
  const matches = Object.entries(manifest.clientModules ?? {}).filter(([key]) =>
    /(?:^|\/)NextIntlClientProvider\.js(?:\s+<module evaluation>)?$/u.test(key),
  );
  const ids = new Set(
    matches.flatMap(([, value]) =>
      value.id === undefined ? [] : [String(value.id)],
    ),
  );
  if (ids.size !== 1) {
    throw new Error(
      `expected one NextIntlClientProvider module id, found ${ids.size}`,
    );
  }
  return [...ids][0];
}

function decodeEmbeddedFlight(htmlSource: string): string {
  const chunks: string[] = [];
  const pattern = /self\.__next_f\.push\(\[1,("(?:\\.|[^"\\])*")\]\)/gu;
  for (const match of htmlSource.matchAll(pattern)) {
    chunks.push(JSON.parse(match[1]) as string);
  }
  if (!chunks.length) {
    throw new Error("HTML artifact contains no embedded Flight payload");
  }
  return chunks.join("");
}

function readFlightRecords(flightSource: string) {
  const imports = new Map<string, string>();
  const values = new Map<string, unknown>();

  for (const line of flightSource.split("\n")) {
    const record = line.match(/^([0-9a-z]+):(.*)$/iu);
    if (!record) continue;
    const [, recordId, payload] = record;
    if (payload.startsWith("I")) {
      try {
        const importRecord = JSON.parse(payload.slice(1)) as unknown;
        if (
          Array.isArray(importRecord) &&
          (typeof importRecord[0] === "number" ||
            typeof importRecord[0] === "string")
        ) {
          imports.set(recordId, String(importRecord[0]));
        }
      } catch {
        // Flight includes records that are not provider imports.
      }
      continue;
    }
    if (!payload.startsWith("[") && !payload.startsWith("{")) continue;
    try {
      values.set(recordId, JSON.parse(payload) as unknown);
    } catch {
      // Length-prefixed text and framework-private records are not JSON values.
    }
  }

  return { imports, values };
}

function resolveRecordReference(
  value: unknown,
  values: ReadonlyMap<string, unknown>,
): unknown {
  if (typeof value !== "string") return value;
  const reference = value.match(/^\$([0-9a-z]+)$/iu);
  return reference && values.has(reference[1])
    ? values.get(reference[1])
    : value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function extractNextIntlProviderPayloads(
  manifestSource: string,
  flightSource: string,
): NextIntlProviderPayload[] {
  const providerModuleId = readNextIntlProviderModuleId(manifestSource);
  const { imports, values } = readFlightRecords(flightSource);
  const providerReferences = new Set(
    [...imports]
      .filter(([, moduleId]) => moduleId === providerModuleId)
      .map(([recordId]) => recordId),
  );
  if (!providerReferences.size) return [];

  const payloads: NextIntlProviderPayload[] = [];
  const visited = new Set<object>();

  const walk = (value: unknown): void => {
    const resolved = resolveRecordReference(value, values);
    if (!resolved || typeof resolved !== "object") return;
    if (visited.has(resolved)) return;
    visited.add(resolved);

    if (Array.isArray(resolved)) {
      const componentReference =
        typeof resolved[1] === "string"
          ? resolved[1].match(/^\$L?([0-9a-z]+)$/iu)?.[1]
          : undefined;
      if (
        resolved[0] === "$" &&
        componentReference &&
        providerReferences.has(componentReference)
      ) {
        const props = resolveRecordReference(resolved[3], values);
        if (!isPlainObject(props)) {
          throw new Error("NextIntlClientProvider props are not an object");
        }
        if (!Object.hasOwn(props, "messages")) {
          throw new Error(
            "NextIntlClientProvider provider props do not contain messages",
          );
        }
        payloads.push({ locale: props.locale, messages: props.messages });
      }
      for (const child of resolved) walk(child);
      return;
    }

    for (const child of Object.values(resolved)) walk(child);
  };

  for (const value of values.values()) walk(value);
  if (!payloads.length) {
    throw new Error(
      "Flight artifact imports NextIntlClientProvider but contains no provider element",
    );
  }
  return payloads;
}

export function readNextIntlProviderPayloads(
  manifestSource: string,
  artifact: { readonly kind: "html" | "rsc"; readonly source: string },
): NextIntlProviderPayload[] {
  const flightSource =
    artifact.kind === "html"
      ? decodeEmbeddedFlight(artifact.source)
      : artifact.source;
  return extractNextIntlProviderPayloads(manifestSource, flightSource);
}
