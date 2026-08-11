export function resolveBuildExampleReturnPath(
  value,
  origin,
  expectedBuildPath,
) {
  const fallback = `${expectedBuildPath}#try-live`;
  if (!value) return fallback;

  let candidate;
  try {
    candidate = new URL(value, origin);
  } catch {
    return fallback;
  }

  const isAllowed =
    candidate.origin === origin &&
    !candidate.username &&
    !candidate.password &&
    candidate.pathname === expectedBuildPath &&
    candidate.search === "" &&
    candidate.hash === "#try-live";

  return isAllowed ? `${candidate.pathname}${candidate.hash}` : fallback;
}
