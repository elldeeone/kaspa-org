export type NextIntlProviderPayload = {
  locale: unknown;
  messages: unknown;
};

export type ClientMessagePolicy = {
  allowedPaths: readonly string[];
  requiredNamespaces: readonly string[];
  requiredPaths?: readonly string[];
};

export function assertClientMessagePolicyCoverage<RouteId extends string>(
  routeIds: readonly RouteId[],
  policies: Readonly<Partial<Record<RouteId, ClientMessagePolicy>>>,
): asserts policies is Readonly<Record<RouteId, ClientMessagePolicy>> {
  const missingRouteIds = routeIds.filter(
    (routeId) => !Object.hasOwn(policies, routeId),
  );
  if (missingRouteIds.length) {
    throw new Error(
      `client message policies missing canonical routes: ${missingRouteIds.join(", ")}`,
    );
  }
}

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

export function readNextIntlProviderModuleId(manifestSource: string): string {
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

export function decodeEmbeddedFlight(htmlSource: string): string {
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
        // Other Flight records are intentionally ignored below.
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

export function extractNextIntlProviderPayloads(
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

function collectMessagePaths(
  value: unknown,
  path: readonly string[],
  paths: string[],
): boolean {
  if (typeof value === "string") {
    paths.push(path.join("."));
    return true;
  }
  if (!isPlainObject(value)) return false;
  let valid = true;
  for (const [key, child] of Object.entries(value)) {
    valid = collectMessagePaths(child, [...path, key], paths) && valid;
  }
  return valid;
}

export function validateClientMessagePayloads(
  payloads: readonly NextIntlProviderPayload[],
  policy: ClientMessagePolicy,
): string[] {
  const errors: string[] = [];
  const errorSet = new Set<string>();
  const report = (message: string) => {
    if (!errorSet.has(message)) {
      errorSet.add(message);
      errors.push(message);
    }
  };

  if (!payloads.some((payload) => payload.messages === null)) {
    report("root NextIntlClientProvider must serialize messages=null");
  }

  const serializedNamespaces = new Set<string>();
  const serializedPaths = new Set<string>();
  for (const payload of payloads) {
    if (payload.messages === null) continue;
    if (!isPlainObject(payload.messages)) {
      report("NextIntlClientProvider messages must be null or a plain object");
      continue;
    }
    for (const namespace of Object.keys(payload.messages)) {
      serializedNamespaces.add(namespace);
    }
    const paths: string[] = [];
    if (!collectMessagePaths(payload.messages, [], paths)) {
      report("NextIntlClientProvider messages must contain string leaves only");
      continue;
    }
    for (const path of paths) {
      serializedPaths.add(path);
      if (
        !policy.allowedPaths.some(
          (allowedPath) =>
            path === allowedPath || path.startsWith(`${allowedPath}.`),
        )
      ) {
        report(`client message path ${path} is not allowed`);
      }
    }
  }

  for (const namespace of policy.requiredNamespaces) {
    if (!serializedNamespaces.has(namespace)) {
      report(`required client message namespace ${namespace} is missing`);
    }
  }
  for (const requiredPath of policy.requiredPaths ?? []) {
    if (
      ![...serializedPaths].some(
        (path) => path === requiredPath || path.startsWith(`${requiredPath}.`),
      )
    ) {
      report(`required client message path ${requiredPath} is missing`);
    }
  }

  return errors;
}
