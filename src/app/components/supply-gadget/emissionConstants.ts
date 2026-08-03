export const SOMPI_PER_KAS = 100_000_000n;
export const SECONDS_PER_MONTH = 2_629_800n; // 365.25 / 12 * 86400

// Historical checkpoint committed to by the hardwired genesis via its UTXO
// commitment. The node verifies that the sum of every entry in the checkpoint
// UTXO set hashes to this commitment, so the total below is proof-anchored.
export const CHECKPOINT_DAA = 1_312_860n;
export const CHECKPOINT_TOTAL_SOMPI = 98_422_254_404_487_171n;

// Mainnet constants
export const DEFLATIONARY_PHASE_DAA = 15_519_600n;
export const PRE_DEFLATIONARY_SUBSIDY = 50_000_000_000n;
export const CRESCENDO_DAA = 110_165_000n;
export const PRE_CRESCENDO_BPS = 1n;
export const POST_CRESCENDO_BPS = 10n;
export const PRE_CRESCENDO_SECONDS = CRESCENDO_DAA - DEFLATIONARY_PHASE_DAA;
