import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10"
            style={{
              background:
                "radial-gradient(circle, #4F7FFF 0%, #1652F0 40%, transparent 70%)",
            }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full opacity-8"
            style={{
              background:
                "radial-gradient(circle, #E8923A 0%, transparent 70%)",
            }}
          />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="flex justify-center mb-8">
            <Logo size={72} />
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-white mb-6">
            Carapace
          </h1>

          <p className="text-xl text-arc-muted max-w-xl mx-auto mb-4 leading-relaxed">
            A DEX where sandwich attacks cannot exist. Every swap in a block
            settles at the same price. Your order looks exactly like your
            neighbor's.
          </p>

          <p className="text-base text-arc-muted max-w-lg mx-auto mb-12">
            Built on Arc's fast finality. Batch windows run every 30 seconds.
            Beneficial arbitrage earns a reward from the protocol.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/swap"
              className="px-7 py-3.5 rounded-xl bg-arc-blue text-white font-semibold text-base hover:bg-blue-600 active:scale-[0.98] transition-all"
            >
              Start swapping
            </Link>
            <Link
              href="/mev"
              className="px-7 py-3.5 rounded-xl border border-arc-border text-white font-semibold text-base hover:border-white/30 hover:bg-white/5 active:scale-[0.98] transition-all"
            >
              Watch the MEV feed
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-arc-border py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-3">
            Why batch auctions block MEV
          </h2>
          <p className="text-center text-arc-muted mb-14 max-w-xl mx-auto">
            Traditional DEXs process swaps one by one. The order they land in a
            block determines the price you get, which is exactly what
            searchers exploit.
          </p>

          <div className="grid sm:grid-cols-3 gap-6">
            <Card
              step="01"
              title="Everyone joins the batch"
              body="Swaps submitted within a 30-second window are collected together. There is no queue, no ordering, no fast-lane."
              color="blue"
            />
            <Card
              step="02"
              title="One price clears the whole batch"
              body="When the window closes, all orders execute at a single clearing price computed from the pool reserves. Sandwich attacks need different prices for different positions. That is not possible here."
              color="amber"
            />
            <Card
              step="03"
              title="Arbitrageurs are paid, not fought"
              body="Cross-venue arbitrage restores fair pricing after each batch. The protocol earns a portion of swap fees and distributes them to back runners who bring prices back to parity."
              color="green"
            />
          </div>
        </div>
      </section>

      {/* Arc section */}
      <section className="border-t border-arc-border py-20 px-6 bg-arc-card/30">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs font-semibold text-arc-blue uppercase tracking-widest mb-4">
              Powered by Arc
            </p>
            <h2 className="text-2xl font-bold text-white mb-4">
              350ms finality changes what batch trading can feel like
            </h2>
            <p className="text-arc-muted leading-relaxed">
              On Ethereum, a 12-second block time means batch windows last
              minutes. Arc settles blocks in roughly 350 milliseconds, so
              Carapace can run a new batch every 30 seconds and still feel
              instant. You submit an order and your fill lands before you've
              finished reading the confirmation.
            </p>
          </div>
          <div className="space-y-4">
            <Stat label="Block time" value="~350ms" sub="Arc Testnet" />
            <Stat label="Batch window" value="30 seconds" sub="10+ blocks per batch" />
            <Stat label="Settlement" value="Uniform price" sub="All fills equal" />
            <Stat label="MEV type allowed" value="Back-running only" sub="Sandwich structurally blocked" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-arc-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-arc-muted">
          <div className="flex items-center gap-2">
            <Logo size={18} />
            <span>Carapace on Arc Testnet</span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="https://testnet.arcscan.app"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              ArcScan
            </a>
            <a
              href="https://rpc.testnet.arc.network"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              RPC
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Card({
  step,
  title,
  body,
  color,
}: {
  step: string;
  title: string;
  body: string;
  color: "blue" | "amber" | "green";
}) {
  const accent =
    color === "blue"
      ? "text-arc-blue"
      : color === "amber"
      ? "text-shell-amber"
      : "text-green-400";

  return (
    <div className="bg-arc-card border border-arc-border rounded-2xl p-6">
      <span className={`text-xs font-mono font-bold ${accent} mb-3 block`}>
        {step}
      </span>
      <h3 className="text-base font-semibold text-white mb-3">{title}</h3>
      <p className="text-sm text-arc-muted leading-relaxed">{body}</p>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-arc-border last:border-0">
      <span className="text-sm text-arc-muted">{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold text-white block">{value}</span>
        <span className="text-xs text-arc-muted">{sub}</span>
      </div>
    </div>
  );
}
