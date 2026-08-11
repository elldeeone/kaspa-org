/**
 * Kaspa emission schedule math — mirrored from rusty-kaspa's
 * `consensus/src/processes/coinbase.rs`.
 *
 * All supply values are in sompi (1 KAS = 100_000_000 sompi).
 * The subsidy table gives the reward-per-second for each month of the
 * deflationary phase. At 1 BPS each block receives the full table value;
 * at 10 BPS each block receives `div_ceil(table_value, 10)`.
 */

import {
  CHECKPOINT_DAA,
  CHECKPOINT_TOTAL_SOMPI,
  CRESCENDO_DAA,
  DEFLATIONARY_PHASE_DAA,
  POST_CRESCENDO_BPS,
  PRE_CRESCENDO_BPS,
  PRE_CRESCENDO_SECONDS,
  PRE_DEFLATIONARY_SUBSIDY,
  SECONDS_PER_MONTH,
  SOMPI_PER_KAS,
} from "./emissionConstants";
import { SUBSIDY_BY_MONTH_TABLE } from "./emissionSubsidyTable";

export {
  CHECKPOINT_DAA,
  CHECKPOINT_TOTAL_SOMPI,
  CRESCENDO_DAA,
  DEFLATIONARY_PHASE_DAA,
  SOMPI_PER_KAS,
} from "./emissionConstants";

function divCeil(dividend: bigint, divisor: bigint): bigint {
  return (dividend + divisor - 1n) / divisor;
}

function subsidyMonth(daaScore: bigint): number {
  if (daaScore < DEFLATIONARY_PHASE_DAA) {
    return -1;
  }

  const secondsSinceDeflationStarted =
    daaScore < CRESCENDO_DAA
      ? (daaScore - DEFLATIONARY_PHASE_DAA) / PRE_CRESCENDO_BPS
      : PRE_CRESCENDO_SECONDS + (daaScore - CRESCENDO_DAA) / POST_CRESCENDO_BPS;

  return Number(secondsSinceDeflationStarted / SECONDS_PER_MONTH);
}

function monthSegments(monthIndex: number): Array<{
  startDaaOffset: bigint;
  endDaaOffset: bigint;
  subsidySompi: bigint;
}> {
  const subsidy = SUBSIDY_BY_MONTH_TABLE[monthIndex];
  const monthStartSeconds = BigInt(monthIndex) * SECONDS_PER_MONTH;
  const monthEndSeconds = monthStartSeconds + SECONDS_PER_MONTH;

  if (PRE_CRESCENDO_SECONDS <= monthStartSeconds) {
    return [
      {
        startDaaOffset:
          PRE_CRESCENDO_SECONDS +
          (monthStartSeconds - PRE_CRESCENDO_SECONDS) * POST_CRESCENDO_BPS,
        endDaaOffset:
          PRE_CRESCENDO_SECONDS +
          (monthEndSeconds - PRE_CRESCENDO_SECONDS) * POST_CRESCENDO_BPS,
        subsidySompi: divCeil(subsidy, POST_CRESCENDO_BPS),
      },
    ];
  }

  if (PRE_CRESCENDO_SECONDS >= monthEndSeconds) {
    return [
      {
        startDaaOffset: monthStartSeconds,
        endDaaOffset: monthEndSeconds,
        subsidySompi: subsidy,
      },
    ];
  }

  return [
    {
      startDaaOffset: monthStartSeconds,
      endDaaOffset: PRE_CRESCENDO_SECONDS,
      subsidySompi: subsidy,
    },
    {
      startDaaOffset: PRE_CRESCENDO_SECONDS,
      endDaaOffset:
        PRE_CRESCENDO_SECONDS +
        (monthEndSeconds - PRE_CRESCENDO_SECONDS) * POST_CRESCENDO_BPS,
      subsidySompi: divCeil(subsidy, POST_CRESCENDO_BPS),
    },
  ];
}

function overlappingTicks(
  daaOffset: bigint,
  startDaaOffset: bigint,
  endDaaOffset: bigint,
): bigint {
  const overlapEnd = daaOffset < endDaaOffset ? daaOffset : endDaaOffset;
  return overlapEnd > startDaaOffset ? overlapEnd - startDaaOffset : 0n;
}

export function computeBlockRewardSompi(daaScore: bigint): bigint {
  if (daaScore < DEFLATIONARY_PHASE_DAA) {
    return PRE_DEFLATIONARY_SUBSIDY;
  }

  const month = subsidyMonth(daaScore);
  const clampedMonth = Math.min(month, SUBSIDY_BY_MONTH_TABLE.length - 1);
  const subsidy = SUBSIDY_BY_MONTH_TABLE[clampedMonth];

  return daaScore >= CRESCENDO_DAA
    ? divCeil(subsidy, POST_CRESCENDO_BPS)
    : subsidy;
}

export function computeExpectedSupply(daaScore: bigint): bigint {
  if (daaScore <= 0n) {
    return 0n;
  }

  const preDeflationaryTicks =
    daaScore < DEFLATIONARY_PHASE_DAA ? daaScore : DEFLATIONARY_PHASE_DAA;
  let total = preDeflationaryTicks * PRE_DEFLATIONARY_SUBSIDY;

  if (daaScore <= DEFLATIONARY_PHASE_DAA) {
    return total;
  }

  const deflationaryDaaOffset = daaScore - DEFLATIONARY_PHASE_DAA;

  for (
    let monthIndex = 0;
    monthIndex < SUBSIDY_BY_MONTH_TABLE.length;
    monthIndex++
  ) {
    for (const segment of monthSegments(monthIndex)) {
      const ticks = overlappingTicks(
        deflationaryDaaOffset,
        segment.startDaaOffset,
        segment.endDaaOffset,
      );

      if (ticks > 0n) {
        total += ticks * segment.subsidySompi;
      }
    }
  }

  return total;
}

export function computeBlockReward(daaScore: bigint): number {
  return Number(computeBlockRewardSompi(daaScore)) / Number(SOMPI_PER_KAS);
}

// Historical supply at a given DAA. Anchored at the proof-committed checkpoint
// total; inside the launch window (DAA <= CHECKPOINT_DAA) the internal shape
// is not reconstructed, so we linearly interpolate from 0 to the checkpoint
// total purely for visual continuity. From CHECKPOINT_DAA onward, issuance
// follows the deterministic consensus schedule.
export function computeHistoricalSupply(daaScore: bigint): bigint {
  if (daaScore <= 0n) {
    return 0n;
  }

  if (daaScore <= CHECKPOINT_DAA) {
    return (CHECKPOINT_TOTAL_SOMPI * daaScore) / CHECKPOINT_DAA;
  }

  return (
    CHECKPOINT_TOTAL_SOMPI +
    computeExpectedSupply(daaScore) -
    computeExpectedSupply(CHECKPOINT_DAA)
  );
}

export function computeMaxSupply(): bigint {
  let total = DEFLATIONARY_PHASE_DAA * PRE_DEFLATIONARY_SUBSIDY;

  for (
    let monthIndex = 0;
    monthIndex < SUBSIDY_BY_MONTH_TABLE.length;
    monthIndex++
  ) {
    for (const segment of monthSegments(monthIndex)) {
      total +=
        (segment.endDaaOffset - segment.startDaaOffset) * segment.subsidySompi;
    }
  }

  return total;
}

export function computeUltimateSupply(): bigint {
  return (
    computeMaxSupply() +
    CHECKPOINT_TOTAL_SOMPI -
    computeExpectedSupply(CHECKPOINT_DAA)
  );
}
