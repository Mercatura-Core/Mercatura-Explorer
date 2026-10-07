import Image from "next/image";

const explorerUrl =
  process.env.NEXT_PUBLIC_EXPLORER_URL ?? "/explorer";

const githubUrl = "https://github.com/Mercatura-Core";

const coreReleaseUrl =
  "https://github.com/Mercatura-Core/Mercatura-Core/releases/tag/v0.1.0-testnet1";

const coreWindowsInstallerUrl =
  "https://github.com/Mercatura-Core/Mercatura-Core/releases/download/v0.1.0-testnet1/Mercatura-Core-v0.1.0-testnet1-win64-setup.exe";

const coreWindowsZipUrl =
  "https://github.com/Mercatura-Core/Mercatura-Core/releases/download/v0.1.0-testnet1/Mercatura-Core-v0.1.0-testnet1-win64.zip";

const coreLinuxUrl =
  "https://github.com/Mercatura-Core/Mercatura-Core/releases/download/v0.1.0-testnet1/Mercatura-Core-v0.1.0-testnet1-linux-x86_64.tar.gz";

const coreMacArm64Url =
  "https://github.com/Mercatura-Core/Mercatura-Core/releases/download/v0.1.0-testnet1/Mercatura-Core-v0.1.0-testnet1-macos-arm64.zip";

const coreChecksumsUrl =
  "https://github.com/Mercatura-Core/Mercatura-Core/releases/download/v0.1.0-testnet1/SHA256SUMS";

const minerReleaseUrl =
  "https://github.com/Mercatura-Core/MercaMiner/releases/tag/v0.1.0-testnet2";

const minerLinuxUrl =
  "https://github.com/Mercatura-Core/MercaMiner/releases/download/v0.1.0-testnet2/MercaMiner-v0.1.0-testnet2-linux-x86_64.tar.gz";

const minerChecksumsUrl =
  "https://github.com/Mercatura-Core/MercaMiner/releases/download/v0.1.0-testnet2/SHA256SUMS";

const features = [
  {
    mark: "MH",
    title: "MercaHash",
    description:
      "CPU-oriented proof of work built around a 128 MiB private mutable scratchpad and deterministic consensus rules.",
  },
  {
    mark: "PQ",
    title: "Post-Quantum Ownership",
    description:
      "ML-DSA-65 is Mercatura's native transaction-authorization path from genesis rather than an optional secondary feature.",
  },
  {
    mark: "SP",
    title: "Adaptive Emission",
    description:
      "Bootstrap issuance transitions into Mercatura's SP-LT adaptive monetary system instead of following a fixed halving schedule.",
  },
  {
    mark: "2×",
    title: "Scheduled Capacity Growth",
    description:
      "Mercatura begins with a conservative 1 MiB effective block cap and doubles scheduled capacity roughly every five years.",
  },
];

const coinSpecs = [
  ["Ticker", "MCA"],
  ["Consensus", "Proof of Work"],
  ["Mining Algorithm", "MercaHash V1"],
  ["Native Ownership", "ML-DSA-65"],
  ["Emission", "Bootstrap → SP-LT adaptive"],
  ["Block Target", "150 seconds"],
  ["Difficulty", "DGWv3 · every block"],
  ["Monetary Precision", "2 decimals"],
  ["Initial Block Cap", "1 MiB"],
  ["Capacity Interval", "1,051,200 blocks · ~5 years"],
  ["Capacity Growth", "2× each interval"],
  ["Scheduled Maximum", "1024 MiB"],
];


function HeroNetworkGraphic() {
  const nodes = [
    [74, 104],
    [146, 64],
    [245, 86],
    [360, 62],
    [440, 132],
    [92, 232],
    [172, 184],
    [354, 190],
    [438, 262],
    [78, 370],
    [178, 332],
    [286, 382],
    [402, 360],
    [332, 452],
    [162, 446],
  ];

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute right-[1%] top-1/2 hidden h-[540px] w-[540px] -translate-y-1/2 lg:block xl:right-[5%]"
    >
      <div className="absolute inset-[9%] rounded-full bg-[radial-gradient(circle,rgba(223,169,63,0.09),rgba(223,169,63,0.025)_42%,transparent_68%)]" />

      <svg
        viewBox="0 0 520 520"
        className="absolute inset-0 h-full w-full"
        fill="none"
      >
        <defs>
          <linearGradient id="mercatura-network-line" x1="60" y1="60" x2="460" y2="460">
            <stop stopColor="#dfa93f" stopOpacity="0.08" />
            <stop offset="0.48" stopColor="#dfa93f" stopOpacity="0.42" />
            <stop offset="1" stopColor="#dfa93f" stopOpacity="0.07" />
          </linearGradient>

          <radialGradient id="mercatura-node-glow">
            <stop stopColor="#f1c55f" stopOpacity="0.85" />
            <stop offset="1" stopColor="#dfa93f" stopOpacity="0.16" />
          </radialGradient>
        </defs>

        <circle cx="260" cy="260" r="210" stroke="#dfa93f" strokeOpacity="0.08" />
        <circle cx="260" cy="260" r="154" stroke="#dfa93f" strokeOpacity="0.12" />
        <circle cx="260" cy="260" r="102" stroke="#dfa93f" strokeOpacity="0.18" />

        <path
          d="M74 104 172 184 245 86 354 190 440 132M92 232 172 184 260 260 354 190 438 262M78 370 178 332 260 260 286 382 402 360M162 446 178 332M286 382 332 452"
          stroke="url(#mercatura-network-line)"
          strokeWidth="1.2"
        />

        <path
          d="M146 64 172 184M360 62 354 190M438 262 402 360"
          stroke="#dfa93f"
          strokeOpacity="0.15"
          strokeWidth="1"
        />

        {nodes.map(([cx, cy], index) => (
          <g key={`${cx}-${cy}`}>
            <circle
              cx={cx}
              cy={cy}
              r={index % 4 === 0 ? 7 : 5}
              fill="#080908"
              stroke="#dfa93f"
              strokeOpacity={index % 4 === 0 ? 0.72 : 0.4}
            />
            <circle
              cx={cx}
              cy={cy}
              r={index % 4 === 0 ? 2.4 : 1.8}
              fill="url(#mercatura-node-glow)"
            />
          </g>
        ))}
      </svg>

      <div className="absolute left-1/2 top-1/2 flex h-[176px] w-[176px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#6c5022]/70 bg-[#090a09]/85 shadow-[0_0_70px_rgba(223,169,63,0.12)]">
        <div className="absolute inset-[13px] rounded-full border border-[#4f3b1d]/70" />

        <Image
          src="/mercatura-logo.webp"
          alt=""
          width={126}
          height={126}
          className="relative opacity-90"
        />
      </div>

      <div className="absolute left-[11%] top-[42%] rounded-md border border-[#403318] bg-[#090a09]/80 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#99732b]">
        MercaHash
      </div>

      <div className="absolute right-[3%] top-[34%] rounded-md border border-[#403318] bg-[#090a09]/80 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#99732b]">
        ML-DSA-65
      </div>

      <div className="absolute bottom-[11%] left-[21%] rounded-md border border-[#403318] bg-[#090a09]/80 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#99732b]">
        SP-LT
      </div>

      <div className="absolute bottom-[19%] right-[7%] rounded-md border border-[#403318] bg-[#090a09]/80 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#99732b]">
        Capacity
      </div>
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M5 12h14M14 7l5 5-5 5" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M14 5h5v5" />
      <path d="m19 5-8 8" />
      <path d="M18 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-3xl">
      <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#ba8b35]">
        {eyebrow}
      </div>

      <h2 className="mt-3 text-2xl font-semibold tracking-[-0.025em] text-[#f2f2ef] sm:text-3xl">
        {title}
      </h2>

      {description ? (
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[#92938f] sm:text-[15px]">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="relative z-30 border-b border-[#3a2b11] bg-[#070807]/98">
        <div className="mx-auto flex min-h-[72px] max-w-[1540px] flex-wrap items-center px-5 sm:px-8">
          <a
            href="#top"
            aria-label="Mercatura home"
            className="flex items-center gap-3"
          >
            <Image
              src="/mercatura-logo.webp"
              alt=""
              width={52}
              height={52}
              priority
              className="rounded-full"
            />

            <div className="leading-none">
              <div className="text-[17px] font-semibold uppercase tracking-[0.24em] text-[#e6b54e]">
                Mercatura
              </div>

              <div className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.52em] text-[#ba8b35]">
                Core
              </div>
            </div>
          </a>

          <nav
            aria-label="Primary navigation"
            className="order-3 flex w-full items-center gap-2 overflow-x-auto py-2 md:order-2 md:ml-auto md:w-auto md:gap-7 md:py-0"
          >
            <a
              href="#about"
              className="whitespace-nowrap px-2 py-5 text-sm text-[#a4a4a4] transition hover:text-white"
            >
              About
            </a>

            <a
              href="#technology"
              className="whitespace-nowrap px-2 py-5 text-sm text-[#a4a4a4] transition hover:text-white"
            >
              Technology
            </a>

            <a
              href="#specs"
              className="whitespace-nowrap px-2 py-5 text-sm text-[#a4a4a4] transition hover:text-white"
            >
              Coin Specs
            </a>

            <a
              href="#downloads"
              className="whitespace-nowrap px-2 py-5 text-sm text-[#a4a4a4] transition hover:text-white"
            >
              Downloads
            </a>

            <a
              href="#testnet"
              className="whitespace-nowrap px-2 py-5 text-sm text-[#a4a4a4] transition hover:text-white"
            >
              Testnet
            </a>

            <a
              href="#documentation"
              className="whitespace-nowrap px-2 py-5 text-sm text-[#a4a4a4] transition hover:text-white"
            >
              Documentation
            </a>

            <a
              href="#roadmap"
              className="whitespace-nowrap px-2 py-5 text-sm text-[#a4a4a4] transition hover:text-white"
            >
              Roadmap
            </a>

            <a
              href="#community"
              className="whitespace-nowrap px-2 py-5 text-sm text-[#a4a4a4] transition hover:text-white"
            >
              Community
            </a>

            <a
              href={explorerUrl}
              className="ml-1 inline-flex items-center gap-2 rounded-lg border border-[#5a431d] bg-[#12110d] px-4 py-2 text-xs font-medium text-[#e2ad43] transition hover:border-[#8e6726] hover:text-[#f0c15b]"
            >
              Explorer
              <ExternalIcon />
            </a>
          </nav>
        </div>
      </header>

      <section
        id="top"
        className="hero-stage scroll-mt-24 border-b border-[#191812]"
      >
        <div className="hero-mesh" />

        <HeroNetworkGraphic />

        <div className="mx-auto max-w-[1540px] px-5 py-20 sm:px-8 sm:py-28 lg:py-32">
          <div className="relative z-10 max-w-[780px]">
            <div className="inline-flex items-center rounded-full border border-[#4a391b] bg-[#0d0e0c]/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#c99a3b]">
              Mercatura Core
            </div>

            <h1 className="mt-7 max-w-[850px] text-4xl font-semibold tracking-[-0.04em] text-[#f2f2ef] sm:text-5xl lg:text-[64px] lg:leading-[1.03]">
              Proof of Work.
              <br />
              <span className="text-[#e3ae43]">Post-Quantum Ownership.</span>
              <br />
              Adaptive Issuance.
            </h1>

            <p className="mt-7 max-w-2xl text-base leading-8 text-[#aaa9a6] sm:text-lg">
              Mercatura is a CPU-oriented proof-of-work digital currency
              designed around native ML-DSA-65 authorization, the MercaHash mining
              algorithm, SP-LT adaptive monetary issuance, and scheduled block-cap
              growth.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href="#downloads"
                className="inline-flex min-h-[46px] items-center gap-2 rounded-lg border-[3px] border-[#cf9630] bg-[linear-gradient(135deg,#f2c45d,#d99b32)] px-5 text-sm font-semibold text-[#171006] shadow-[0_10px_30px_rgba(0,0,0,0.28)] transition hover:brightness-110"
              >
                Download Mercatura Core
                <ArrowIcon />
              </a>

              <a
                href="#downloads"
                className="inline-flex min-h-[46px] items-center gap-2 rounded-lg border-[3px] border-[#5a431d] bg-[#11120f]/95 px-5 text-sm font-medium text-[#d9aa45] transition hover:border-[#8e6726] hover:text-[#efbd55]"
              >
                Download MercaMiner
              </a>

              <a
                href={explorerUrl}
                className="inline-flex min-h-[46px] items-center gap-2 rounded-lg border border-[#34352f] bg-[#0d0f0f]/90 px-5 text-sm font-medium text-[#c7c8c4] transition hover:border-[#5b5c55] hover:text-white"
              >
                Open Explorer
                <ExternalIcon />
              </a>
            </div>

          </div>
        </div>
      </section>

      <section
        id="about"
        className="scroll-mt-24 border-b border-[#191a18]"
      >
        <div className="mx-auto grid max-w-[1540px] gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:py-24">
          <SectionHeading
            eyebrow="What is Mercatura?"
            title="A deliberately simple proof-of-work network."
            description="Mercatura keeps the familiar full-node, wallet, mining, and public-ledger model while replacing several inherited assumptions with Mercatura-specific consensus rules."
          />

          <div className="gold-panel rounded-[12px] px-6 py-6 sm:px-8 sm:py-8">
            <p className="text-[15px] leading-8 text-[#b6b7b3]">
              Mercatura is built around independent proof-of-work mining,
              transparent chain state, native post-quantum ownership, and an
              adaptive emission system. The project deliberately avoids
              masternodes, proof of stake, protocol treasuries, and governance
              payouts.
            </p>

            <div className="mt-6 border-t border-[#2a2922] pt-6">
              <p className="text-sm leading-7 text-[#888a86]">
                Core software, miner software, specifications, and Explorer
                infrastructure are intended to remain openly inspectable and
                independently runnable.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="technology"
        className="scroll-mt-24 border-b border-[#191a18]"
      >
        <div className="mx-auto max-w-[1540px] px-5 py-20 sm:px-8 lg:py-24">
          <SectionHeading
            eyebrow="Core technology"
            title="Four foundations of the Mercatura network."
            description="The landing page keeps the overview concise. Full technical specifications will live in the documentation."
          />

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="gold-panel min-h-[230px] rounded-[12px] px-6 py-6"
              >
                <div className="metric-icon flex h-14 w-14 items-center justify-center rounded-full text-sm font-semibold tracking-[0.08em] text-[#e6b54b]">
                  {feature.mark}
                </div>

                <h3 className="mt-6 text-lg font-semibold text-[#efefec]">
                  {feature.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-[#858783]">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="specs"
        className="scroll-mt-24 border-b border-[#191a18]"
      >
        <div className="mx-auto max-w-[1540px] px-5 py-20 sm:px-8 lg:py-24">
          <SectionHeading
            eyebrow="Coin Specs"
            title="Mercatura at a glance."
            description="The defining architecture belongs above. This section keeps the conventional network parameters and monetary constants easy to find without giving routine specifications undue emphasis."
          />

          <div className="mt-10 overflow-hidden rounded-[12px] border-[3px] border-[#5a431d] bg-[#090b0a]">
            <div className="grid sm:grid-cols-2 xl:grid-cols-3">
              {coinSpecs.map(([label, value], index) => (
                <div
                  key={label}
                  className={[
                    "min-h-[102px] px-5 py-5",
                    "border-[#292923]",
                    index % 3 !== 2 ? "xl:border-r-[3px]" : "",
                    index % 2 === 0 ? "sm:border-r-[3px] xl:border-r-[3px]" : "sm:border-r-0",
                    index < coinSpecs.length - 2 ? "border-b-[3px]" : "sm:border-b-0",
                    index < coinSpecs.length - 3 ? "xl:border-b-[3px]" : "",
                  ].join(" ")}
                >
                  <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#777975]">
                    {label}
                  </div>

                  <div className="mt-3 text-[15px] font-semibold text-[#e4b149]">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="downloads"
        className="scroll-mt-24 border-b border-[#191a18]"
      >
        <div className="mx-auto max-w-[1540px] px-5 py-20 sm:px-8 lg:py-24">
          <SectionHeading
            eyebrow="Downloads"
            title="Official Mercatura software."
            description="Public Testnet release packages are available below. Verify every download against the published SHA-256 checksums before use."
          />

          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            <article className="gold-panel rounded-[12px] p-6 sm:p-8">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b28734]">
                Node + Wallet
              </div>

              <h3 className="mt-3 text-2xl font-semibold text-[#f0f0ed]">
                Mercatura Core
              </h3>

              <p className="mt-4 max-w-xl text-sm leading-7 text-[#8e8f8c]">
                Run a full node, use the Mercatura Qt wallet, interact through
                RPC, and participate directly in the peer-to-peer network.
              </p>

              <div className="mt-7 flex flex-wrap gap-2">
                {["Windows x86-64", "Linux x86-64", "macOS ARM64"].map((platform) => (
                  <span
                    key={platform}
                    className="rounded-md border border-[#34342f] bg-[#101211] px-3 py-1.5 text-xs text-[#9c9d99]"
                  >
                    {platform}
                  </span>
                ))}
              </div>

              <div className="mt-8 grid gap-2 border-t border-[#292923] pt-6 sm:grid-cols-2">
                <a
                  href={coreWindowsInstallerUrl}
                  className="inline-flex min-h-[44px] items-center justify-between gap-3 rounded-lg border border-[#5a431d] bg-[#12110d] px-4 text-sm font-medium text-[#d9aa45] transition hover:border-[#8e6726] hover:text-[#efbd55]"
                >
                  Windows Installer
                  <ArrowIcon />
                </a>

                <a
                  href={coreWindowsZipUrl}
                  className="inline-flex min-h-[44px] items-center justify-between gap-3 rounded-lg border border-[#3d3e38] bg-[#0e100f] px-4 text-sm font-medium text-[#c5c6c2] transition hover:border-[#62635c] hover:text-white"
                >
                  Windows Portable ZIP
                  <ArrowIcon />
                </a>

                <a
                  href={coreLinuxUrl}
                  className="inline-flex min-h-[44px] items-center justify-between gap-3 rounded-lg border border-[#5a431d] bg-[#12110d] px-4 text-sm font-medium text-[#d9aa45] transition hover:border-[#8e6726] hover:text-[#efbd55]"
                >
                  Linux x86-64
                  <ArrowIcon />
                </a>

                <a
                  href={coreMacArm64Url}
                  className="inline-flex min-h-[44px] items-center justify-between gap-3 rounded-lg border border-[#3d3e38] bg-[#0e100f] px-4 text-sm font-medium text-[#c5c6c2] transition hover:border-[#62635c] hover:text-white"
                >
                  macOS ARM64
                  <ArrowIcon />
                </a>
              </div>

              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs">
                <a
                  href={coreReleaseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#b88932] transition hover:text-[#efbd55]"
                >
                  Release notes
                  <ExternalIcon />
                </a>

                <a
                  href={coreChecksumsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#b88932] transition hover:text-[#efbd55]"
                >
                  SHA256SUMS
                  <ExternalIcon />
                </a>
              </div>

              <p className="mt-5 text-xs leading-6 text-[#696b67]">
                The macOS build is for Apple Silicon and is not currently notarized.
              </p>
            </article>

            <article className="gold-panel rounded-[12px] p-6 sm:p-8">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b28734]">
                CPU Miner
              </div>

              <h3 className="mt-3 text-2xl font-semibold text-[#f0f0ed]">
                MercaMiner
              </h3>

              <p className="mt-4 max-w-xl text-sm leading-7 text-[#8e8f8c]">
                Mercatura's reference CPU miner for MercaHash, with solo RPC
                mining, continuous operation, stale-work handling, and network
                validation.
              </p>

              <div className="mt-7 flex flex-wrap gap-2">
                {["Linux x86-64", "Public Testnet"].map((platform) => (
                  <span
                    key={platform}
                    className="rounded-md border border-[#34342f] bg-[#101211] px-3 py-1.5 text-xs text-[#9c9d99]"
                  >
                    {platform}
                  </span>
                ))}
              </div>

              <div className="mt-8 border-t border-[#292923] pt-6">
                <a
                  href={minerLinuxUrl}
                  className="inline-flex min-h-[44px] w-full items-center justify-between gap-3 rounded-lg border border-[#5a431d] bg-[#12110d] px-4 text-sm font-medium text-[#d9aa45] transition hover:border-[#8e6726] hover:text-[#efbd55]"
                >
                  Download Linux x86-64
                  <ArrowIcon />
                </a>
              </div>

              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs">
                <a
                  href={minerReleaseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#b88932] transition hover:text-[#efbd55]"
                >
                  Release notes
                  <ExternalIcon />
                </a>

                <a
                  href={minerChecksumsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#b88932] transition hover:text-[#efbd55]"
                >
                  SHA256SUMS
                  <ExternalIcon />
                </a>
              </div>

              <p className="mt-5 text-xs leading-6 text-[#696b67]">
                Reference MercaHash V1 CPU miner for the Mercatura Public Testnet.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section
        id="testnet"
        className="scroll-mt-24 border-b border-[#191a18]"
      >
        <div className="mx-auto max-w-[1540px] px-5 py-20 sm:px-8 lg:py-24">
          <div className="gold-panel overflow-hidden rounded-[14px]">
            <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
              <div className="p-7 sm:p-10">
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#ba8b35]">
                  Testnet
                </div>

                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-[#f2f2ef]">
                  Mercatura Public Testnet is live.
                </h2>

                <p className="mt-5 max-w-2xl text-sm leading-7 text-[#939490] sm:text-[15px]">
                  The public network is now available for distributed node,
                  wallet, mining, peer-to-peer, Explorer, and operational
                  validation ahead of Mainnet.
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <a
                    href="#downloads"
                    className="inline-flex items-center gap-2 rounded-lg border-[3px] border-[#5a431d] bg-[#12110d] px-4 py-2.5 text-sm font-medium text-[#d9aa45] transition hover:border-[#8e6726]"
                  >
                    Testnet Downloads
                    <ArrowIcon />
                  </a>

                  <a
                    href={explorerUrl}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#34352f] bg-[#0d0f0f] px-4 py-2.5 text-sm text-[#b8b9b5] transition hover:border-[#55564f] hover:text-white"
                  >
                    Explorer
                    <ExternalIcon />
                  </a>
                </div>
              </div>

              <div className="border-t border-[#29271f] bg-[#090a09] p-7 sm:p-10 lg:border-l lg:border-t-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#777975]">
                  Initial validation focus
                </div>

                <div className="mt-5 space-y-4">
                  {[
                    "Independent full nodes",
                    "Cross-network wallet transactions",
                    "Continuous MercaHash mining",
                    "P2P propagation and reconnect behavior",
                    "Explorer reconciliation",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 border-b border-[#22231f] pb-3 last:border-0"
                    >
                      <span className="text-[#dba63d]">◇</span>
                      <span className="text-sm text-[#a4a5a1]">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="documentation"
        className="scroll-mt-24 border-b border-[#191a18]"
      >
        <div className="mx-auto max-w-[1540px] px-5 py-20 sm:px-8 lg:py-24">
          <SectionHeading
            eyebrow="Documentation"
            title="Technical detail without marketing filler."
            description="Mercatura documentation will focus on the parts of the system that are useful to operators, miners, developers, and technical reviewers."
          />

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: "MercaHash V1",
                description:
                  "Technical overview of Mercatura's memory-hard proof-of-work.",
                href: "/docs/mercahash-v1-technical-overview.pdf",
              },
              {
                title: "SP-LT Adaptive Emission",
                description:
                  "Technical guide to Mercatura's bootstrap and adaptive block reward system.",
                href: "/docs/sp-lt-adaptive-emission-technical-guide.pdf",
              },
              {
                title: "Full Node Guide",
                description:
                  "Install, configure, connect, and operate a Mercatura full node.",
                href: "/docs/mercatura-full-node-guide.pdf",
              },
              {
                title: "Qt Wallet Guide",
                description:
                  "Create, secure, back up, receive, send, and restore a Mercatura wallet.",
                href: "/docs/mercatura-qt-wallet-guide.pdf",
              },
              {
                title: "MercaMiner Guide",
                description:
                  "Build, configure, benchmark, monitor, and run the reference CPU miner.",
                href: "/docs/mercaminer-running-guide.pdf",
              },
            ].map((document) => (
              <a
                key={document.title}
                href={document.href}
                target="_blank"
                rel="noreferrer"
                className="gold-panel-soft flex min-h-[185px] flex-col rounded-[10px] px-5 py-5 transition hover:border-[#745520]"
              >
                <h3 className="text-sm font-semibold text-[#e8e8e5]">
                  {document.title}
                </h3>

                <p className="mt-2 flex-1 text-xs leading-6 text-[#7f817d]">
                  {document.description}
                </p>

                <div className="mt-5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#b88932]">
                  View PDF →
                </div>
              </a>
            ))}
          </div>

          <div className="mt-8">
            <a
              href={githubUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#d7a33c] transition hover:text-[#efbd55]"
            >
              View Mercatura on GitHub
              <ExternalIcon />
            </a>
          </div>
        </div>
      </section>

      <section
        id="roadmap"
        className="scroll-mt-24 border-b border-[#191a18]"
      >
        <div className="mx-auto max-w-[1540px] px-5 py-20 sm:px-8 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#ba8b35]">
              Development Roadmap
            </div>

            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.025em] text-[#f2f2ef] sm:text-3xl">
              Building Mercatura in deliberate stages.
            </h2>

            <p className="mt-4 text-sm leading-7 text-[#92938f] sm:text-[15px]">
              Mercatura development follows a long-term technical plan spanning
              network launch, usability, protocol research, and future scaling.
            </p>

            <div className="mx-auto mt-6 max-w-2xl rounded-[10px] border border-[#493719] bg-[#0d0e0c] px-5 py-4 text-xs leading-6 text-[#a28343]">
              Roadmap dates are tentative development targets, not fixed release
              commitments. Timing may change as testing, security review,
              engineering requirements, network conditions, and research results
              evolve.
            </div>
          </div>

          <div className="relative mx-auto mt-14 max-w-6xl">
            <div className="absolute bottom-0 left-[15px] top-0 w-px bg-[linear-gradient(180deg,rgba(223,169,63,0.15),rgba(223,169,63,0.75)_15%,rgba(223,169,63,0.45)_85%,rgba(223,169,63,0.08))] md:left-1/2 md:-translate-x-1/2" />

            {[
              {
                date: "Q3–Q4 2026",
                title: "Core Foundation",
                status: "Complete",
                description:
                  "Mercatura Core, MercaHash V1, native ML-DSA-65 ownership, adaptive emission, wallet, miner, Explorer, and foundational network infrastructure.",
              },
              {
                date: "Q4 2026",
                title: "Public Testnet",
                status: "Current",
                description:
                  "Distributed node, wallet, mining, P2P, recovery, reorg, Explorer, and operational validation across independent systems and geographic regions.",
              },
              {
                date: "Q4 2026",
                title: "Mainnet Readiness",
                status: "Next",
                description:
                  "Resolve Testnet findings, finalize launch parameters, harden releases and infrastructure, complete documentation, and prepare the production network.",
              },
              {
                date: "Q1–Q2 2027",
                title: "Mercatura Mobile & Ecosystem Integrations",
                status: "Planned",
                description:
                  "Develop the first-party Mercatura mobile wallet and focus on practical integrations including payment processors, merchant tooling, and supporting infrastructure.",
              },
              {
                date: "Q1–Q2 2027",
                title: "PoW-Native Instant Finality R&D",
                status: "Research",
                description:
                  "Research, prototype, simulate, and adversarially test BlockCert, SpendCert, and related proof-of-work-native finality mechanisms.",
              },
              {
                date: "Q3–Q4 2027",
                title: "PoW-Native Instant Finality Network Upgrade",
                status: "Conditional",
                description:
                  "Target a production network upgrade only if the preceding research, implementation, security testing, and Testnet validation support deployment.",
              },
              {
                date: "2028",
                title: "Reservoir Scaling Research",
                status: "Research",
                description:
                  "Begin research and prototyping around the Reservoir scaling architecture and its interaction with Mercatura's existing consensus and finality systems.",
              },
            ].map((milestone, index) => {
              const leftSide = index % 2 === 0;

              const statusStyle =
                milestone.status === "Complete"
                  ? "border-[#6e5425] bg-[#17130c] text-[#dfad49]"
                  : milestone.status === "Current"
                    ? "border-[#8b6726] bg-[#1a150b] text-[#f0bd53]"
                    : milestone.status === "Research" ||
                        milestone.status === "Conditional"
                      ? "border-[#514525] bg-[#12110d] text-[#c79b43]"
                      : "border-[#484a44] bg-[#101211] text-[#b2b4ae]";

              const active =
                milestone.status === "Complete" ||
                milestone.status === "Current";

              return (
                <div
                  key={`${milestone.date}-${milestone.title}`}
                  className="relative grid grid-cols-[32px_1fr] gap-5 pb-8 last:pb-0 md:grid-cols-[1fr_70px_1fr] md:gap-0"
                >
                  <div
                    className={[
                      "hidden md:block",
                      leftSide
                        ? "col-start-1 pr-8"
                        : "col-start-3 pl-8",
                    ].join(" ")}
                  >
                    <article className="gold-panel rounded-[12px] p-6">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ba8b35]">
                          {milestone.date}
                        </div>

                        <span
                          className={[
                            "rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em]",
                            statusStyle,
                          ].join(" ")}
                        >
                          {milestone.status}
                        </span>
                      </div>

                      <h3 className="mt-4 text-lg font-semibold text-[#efefec]">
                        {milestone.title}
                      </h3>

                      <p className="mt-3 text-sm leading-7 text-[#858783]">
                        {milestone.description}
                      </p>
                    </article>
                  </div>

                  <div className="relative z-10 col-start-1 row-start-1 flex justify-center md:col-start-2">
                    <div
                      className={[
                        "mt-7 flex h-[30px] w-[30px] items-center justify-center rounded-full border bg-[#080908]",
                        active
                          ? "border-[#d8a33a] shadow-[0_0_22px_rgba(223,169,63,0.22)]"
                          : "border-[#5c4822]",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "h-2.5 w-2.5 rounded-full",
                          active
                            ? "bg-[#e1ad43]"
                            : "bg-[#51401f]",
                        ].join(" ")}
                      />
                    </div>
                  </div>

                  <div className="col-start-2 row-start-1 md:hidden">
                    <article className="gold-panel rounded-[12px] p-5">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ba8b35]">
                          {milestone.date}
                        </div>

                        <span
                          className={[
                            "rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em]",
                            statusStyle,
                          ].join(" ")}
                        >
                          {milestone.status}
                        </span>
                      </div>

                      <h3 className="mt-4 text-base font-semibold text-[#efefec]">
                        {milestone.title}
                      </h3>

                      <p className="mt-3 text-sm leading-7 text-[#858783]">
                        {milestone.description}
                      </p>
                    </article>
                  </div>

                  <div
                    className={[
                      "hidden md:flex md:items-start",
                      leftSide
                        ? "col-start-3 justify-start pl-8"
                        : "col-start-1 row-start-1 justify-end pr-8",
                    ].join(" ")}
                  >
                    <div className="mt-7 text-[10px] font-medium uppercase tracking-[0.12em] text-[#5f605c]">
                      {leftSide ? milestone.status : milestone.date}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="community"
        className="scroll-mt-24 border-b border-[#191a18]"
      >
        <div className="mx-auto max-w-[1540px] px-5 py-16 sm:px-8 lg:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#ba8b35]">
              Community
            </div>

            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.025em] text-[#f2f2ef] sm:text-3xl">
              Follow, discuss, build, and participate.
            </h2>

            <p className="mt-4 text-sm leading-7 text-[#92938f] sm:text-[15px]">
              Mercatura uses different community channels for different purposes,
              from official project updates to technical support and long-form
              discussion.
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-6xl gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                name: "X / Twitter",
                description:
                  "Official news, releases, milestones, and project updates.",
                href: "https://x.com/MercaturaCore",
                icon: "/social/x.svg",
                status: "Visit",
              },
              {
                name: "Reddit",
                description:
                  "User-led discussion and community conversation.",
                href: "https://www.reddit.com/r/Mercatura/",
                icon: "/social/reddit.svg",
                status: "Visit",
              },
              {
                name: "Discord",
                description:
                  "Technical help, guides, troubleshooting, and support.",
                href: "https://discord.gg/DJbwa9fRT",
                icon: "/social/discord.svg",
                status: "Join",
              },
              {
                name: "BitcoinTalk",
                description:
                  "Project history, technical discussion, and long-form community record.",
                href: "https://bitcointalk.org/index.php?topic=5595967.0",
                icon: "/social/bitcointalk.ico",
                status: "Visit",
              },
            ].map((social) =>
              social.href ? (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  className="gold-panel-soft group flex min-h-[190px] flex-col rounded-[10px] px-5 py-5 transition hover:border-[#745520] hover:bg-[#0d0f0e]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-[9px] border border-[#5b4521] bg-[#0a0b0a]">
                    <img
                      src={social.icon ?? ""}
                      alt=""
                      aria-hidden="true"
                      className="h-5 w-5 object-contain"
                    />
                  </div>

                  <h3 className="mt-5 text-sm font-semibold text-[#e8e8e5] transition group-hover:text-[#f1c55f]">
                    {social.name}
                  </h3>

                  <p className="mt-2 flex-1 text-xs leading-6 text-[#7f817d]">
                    {social.description}
                  </p>

                  <div className="mt-5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#b88932]">
                    {social.status} →
                  </div>
                </a>
              ) : (
                <article
                  key={social.name}
                  className="gold-panel-soft flex min-h-[190px] flex-col rounded-[10px] px-5 py-5"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-[9px] border border-[#393222] bg-[#0a0b0a] text-sm font-semibold text-[#8e6b2a]">
                    B
                  </div>

                  <h3 className="mt-5 text-sm font-semibold text-[#e8e8e5]">
                    {social.name}
                  </h3>

                  <p className="mt-2 flex-1 text-xs leading-6 text-[#7f817d]">
                    {social.description}
                  </p>

                  <div className="mt-5 text-[10px] uppercase tracking-[0.1em] text-[#6f5a31]">
                    {social.status}
                  </div>
                </article>
              ),
            )}
          </div>
        </div>
      </section>

      <footer className="bg-[#070807]">
        <div className="mx-auto flex max-w-[1540px] flex-col gap-8 px-5 py-10 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/mercatura-logo.webp"
              alt=""
              width={42}
              height={42}
              className="rounded-full"
            />

            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-[#dca944]">
                Mercatura
              </div>
              <div className="mt-1 text-[10px] text-[#666864]">
                Open proof-of-work infrastructure.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs text-[#7e807c]">
            <a href="#downloads" className="transition hover:text-white">
              Downloads
            </a>
            <a href="#documentation" className="transition hover:text-white">
              Documentation
            </a>
            <a
              href={explorerUrl}
              className="transition hover:text-white"
            >
              Explorer
            </a>
            <a
              href={githubUrl}
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-white"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
