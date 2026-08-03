import {
  CHECKPOINT_DAA,
  CRESCENDO_DAA,
  DEFLATIONARY_PHASE_DAA,
} from "./emissionConstants";
import { computeHistoricalSupply } from "./emissionMath";

export const milestoneIds = [
  "genesis",
  "checkpoint",
  "preDeflationary",
  "chromatic",
  "crescendo",
] as const;

export type MilestoneId = (typeof milestoneIds)[number];

export type Milestone = {
  id: MilestoneId;
  date: {
    start: number;
    end?: number;
  };
  daaScore: bigint;
};

export type HistoricalMilestone = Milestone & {
  expectedSompi: bigint;
};

const HISTORICAL_MILESTONES: Milestone[] = [
  {
    id: "genesis",
    date: { start: Date.UTC(2021, 10, 7) },
    daaScore: 0n,
  },
  {
    id: "checkpoint",
    date: { start: Date.UTC(2021, 10, 22) },
    daaScore: CHECKPOINT_DAA,
  },
  {
    id: "preDeflationary",
    date: {
      start: Date.UTC(2021, 10, 22),
      end: Date.UTC(2022, 4, 7),
    },
    daaScore: (CHECKPOINT_DAA + DEFLATIONARY_PHASE_DAA) / 2n,
  },
  {
    id: "chromatic",
    date: { start: Date.UTC(2022, 4, 7) },
    daaScore: DEFLATIONARY_PHASE_DAA,
  },
  {
    id: "crescendo",
    date: { start: Date.UTC(2025, 4, 5) },
    daaScore: CRESCENDO_DAA,
  },
];

export function getHistoricalMilestones(): HistoricalMilestone[] {
  return HISTORICAL_MILESTONES.map((milestone) => ({
    ...milestone,
    expectedSompi: computeHistoricalSupply(milestone.daaScore),
  }));
}
