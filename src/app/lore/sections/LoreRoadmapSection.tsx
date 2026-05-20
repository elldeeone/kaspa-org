import { LoreLink } from "../LoreLink";

export function LoreRoadmapSection(): React.JSX.Element {
  return (
    <>
      <hr className="my-6 border-t border-[var(--border-subtle)]" />

      <h3 className="text-primary text-[15px] font-bold">Toccata hardfork</h3>
      <p className="text-secondary mt-2 text-[15px] leading-[1.72]">
        The next hardfork is Toccata, introducing covenant-based base-layer
        programmability. Covenants are recursive spending rules that restrict
        who and how coins can be spent, opening the way to vaults, smart
        wallets, native assets, and ZK-assisted constructions.
      </p>
      <p className="text-secondary mt-3 text-[15px] leading-[1.72]">
        In Bitcoin, OP_CAT is the old opcode Satoshi disabled - proposed again,
        still debated, still not included. Toccata is closer to OP_CAT++, with a
        broader covenant surface and{" "}
        <LoreLink href="https://github.com/kaspanet/silverscript/">
          Silverscript
        </LoreLink>{" "}
        as a dedicated compiler for writing covenants in Kaspa. A mature
        implementation is already up and running on{" "}
        <LoreLink href="https://medium.com/@michaelsuttonil/kaspa-covenants-toccata-hard-fork-outlook-a4d81a40900c">
          TN12
        </LoreLink>
        .
      </p>

      <hr className="my-6 border-t border-[var(--border-subtle)]" />

      <h3 className="text-primary text-[15px] font-bold">DAGKnight hardfork</h3>
      <p className="text-secondary mt-2 text-[15px] leading-[1.72]">
        DAGKnight is the consensus protocol upgrade that follows Toccata. It is
        a major leap for proof of work and for permissionless consensus: the
        only 49% BFT partially synchronous protocol (in the oblivious setup). It
        is a step toward netsplit-resilient proof of work. Block times are
        targeted for the 40-25 millisecond range.{" "}
        <LoreLink href="https://eprint.iacr.org/2022/1494.pdf">
          DAGKnight paper
        </LoreLink>{" "}
      </p>

      <hr className="my-6 border-t border-[var(--border-subtle)]" />

      <h3 className="text-primary text-[15px] font-bold">2027 hardfork</h3>
      <p className="text-secondary mt-2 text-[15px] leading-[1.72]">
        10 millisecond block time - 100 blocks per second - would likely require
        DAG algorithmic adjustments to how miners reference DAG tips, alongside
        further node performance optimizations. Targeted for a 2027 hardfork.
      </p>
      <p className="text-secondary mt-3 text-[15px] leading-[1.72]">
        On the consensus side, DAGKnight already provides safety under
        netsplits: transactions confirmed before a split remain final. But it
        does not provide progress during a split - transactions cannot actually
        be confirmed until the split is over. The 2027 work aims to add
        practical progress through a combination of on-chain payment channels
        and hashrate-adaptive finality windows. This would make Kaspa wargrade
        hard money, with local payment flows surviving broken internet
        conditions.
      </p>
    </>
  );
}
