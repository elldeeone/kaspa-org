import { readNextIntlProviderPayloads } from "./next-client-payload-adapter.mts";

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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
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

function validateClientMessagePayloads(
  payloads: readonly { locale: unknown; messages: unknown }[],
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

export async function auditClientPayloadArtifacts({
  routePath,
  manifestSource,
  artifacts,
  policy,
  expectedLocale,
}: {
  routePath: string;
  manifestSource: string;
  artifacts:
    | Iterable<{
        kind: "html" | "rsc";
        path: string;
        source: string;
        providerRequired: boolean;
      }>
    | AsyncIterable<{
        kind: "html" | "rsc";
        path: string;
        source: string;
        providerRequired: boolean;
      }>;
  policy: ClientMessagePolicy;
  expectedLocale: string;
}): Promise<string[]> {
  const errors: string[] = [];
  const payloads: Array<{ locale: unknown; messages: unknown }> = [];

  for await (const artifact of artifacts) {
    const artifactPayloads = readNextIntlProviderPayloads(
      manifestSource,
      artifact,
    );
    if (artifact.providerRequired && !artifactPayloads.length) {
      errors.push(`${artifact.path}: no NextIntlClientProvider payload found`);
    }
    payloads.push(...artifactPayloads);
  }

  for (const issue of validateClientMessagePayloads(payloads, policy)) {
    errors.push(`${routePath}: ${issue}`);
  }
  for (const payload of payloads) {
    if (payload.locale !== expectedLocale) {
      errors.push(
        `${routePath}: provider locale ${JSON.stringify(payload.locale)} does not match ${expectedLocale}`,
      );
    }
  }

  return errors;
}
