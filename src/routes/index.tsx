import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Foundry — Studio for ambitious brands" },
      {
        name: "description",
        content:
          "Foundry is an independent studio crafting identity, product and motion for brands that refuse to blend in.",
      },
      { property: "og:title", content: "Foundry — Studio for ambitious brands" },
      {
        property: "og:description",
        content: "Identity, product and motion for brands that refuse to blend in.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,300..900,0..100&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <Nav />
      <Hero />
      <Marquee />
      <Work />
      <Manifesto />
      <Services />
      <CTA />
      <Footer />
    </main>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-foreground/15 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center gap-2 font-display text-2xl font-black tracking-tight">
          <span className="inline-block h-3 w-3 rotate-45 bg-foreground" />
          Foundry<span className="text-acid">.</span>
        </a>
        <nav className="hidden items-center gap-8 font-mono text-xs uppercase tracking-widest md:flex">
          <a href="#work" className="hover:text-foreground/60">Work</a>
          <a href="#services" className="hover:text-foreground/60">Services</a>
          <a href="#manifesto" className="hover:text-foreground/60">Manifesto</a>
          <a href="#contact" className="hover:text-foreground/60">Contact</a>
        </nav>
        <a
          href="#contact"
          className="group inline-flex items-center gap-2 rounded-full border border-foreground bg-foreground px-4 py-2 font-mono text-xs uppercase tracking-wider text-background transition hover:bg-acid hover:text-acid-foreground"
        >
          Start a project
          <span className="transition group-hover:translate-x-0.5">→</span>
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-60" />
      <div className="noise relative mx-auto max-w-7xl px-6 pb-24 pt-20 md:pt-32">
        <div className="mb-10 flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-foreground/60">
          <span className="h-px w-10 bg-foreground/40" />
          Est. 2018 · Lisbon / NYC
        </div>

        <h1 className="font-display text-[15vw] font-light leading-[0.85] tracking-[-0.04em] text-balance md:text-[10rem]">
          Brands<br />
          <span className="italic">that refuse</span><br />
          to <span className="relative inline-block">
            <span className="relative z-10">blend in.</span>
            <span className="absolute inset-x-0 bottom-2 -z-0 h-5 bg-acid md:bottom-4 md:h-8" />
          </span>
        </h1>

        <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-12">
          <div className="md:col-span-1" />
          <p className="md:col-span-2 max-w-xl text-lg leading-relaxed text-foreground/75">
            We're an independent studio of seventeen designers, engineers and writers. We make
            identity systems, products and films for founders who'd rather be misunderstood than
            forgotten.
          </p>
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-4">
          <a
            href="#work"
            className="inline-flex items-center gap-3 rounded-full bg-foreground px-6 py-4 font-mono text-xs uppercase tracking-wider text-background transition hover:bg-acid hover:text-acid-foreground"
          >
            See selected work →
          </a>
          <a
            href="#manifesto"
            className="inline-flex items-center gap-3 rounded-full border border-foreground/30 px-6 py-4 font-mono text-xs uppercase tracking-wider hover:border-foreground"
          >
            Read the manifesto
          </a>
        </div>

        <div className="mt-24 grid grid-cols-2 gap-8 border-t border-foreground/15 pt-8 md:grid-cols-4">
          {[
            ["120+", "Brands launched"],
            ["17", "Senior makers"],
            ["4", "D&AD pencils"],
            ["98%", "Retention rate"],
          ].map(([k, v]) => (
            <div key={v}>
              <div className="font-display text-5xl font-light tracking-tight">{k}</div>
              <div className="mt-2 font-mono text-[11px] uppercase tracking-widest text-foreground/60">
                {v}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Marquee() {
  const items = [
    "Identity",
    "★",
    "Product Design",
    "★",
    "Motion",
    "★",
    "Editorial",
    "★",
    "Strategy",
    "★",
    "Web",
    "★",
    "Packaging",
    "★",
  ];
  const row = [...items, ...items];
  return (
    <section className="border-y border-foreground bg-foreground py-6 text-background">
      <div className="overflow-hidden">
        <div className="marquee flex w-max gap-12 whitespace-nowrap font-display text-5xl italic">
          {row.map((t, i) => (
            <span key={i} className={t === "★" ? "text-acid not-italic" : ""}>
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Work() {
  const projects = [
    {
      n: "01",
      tag: "Identity · Web",
      title: "Halcyon Coffee",
      blurb: "A wholesale roaster reborn as a cult retail brand across 14 cities.",
      tone: "bg-[oklch(0.78_0.15_55)]",
    },
    {
      n: "02",
      tag: "Product · Motion",
      title: "Field Notes OS",
      blurb: "Operating system and identity for a writing tool used by 80k creators.",
      tone: "bg-[oklch(0.55_0.18_265)] text-background",
    },
    {
      n: "03",
      tag: "Editorial",
      title: "After Hours Quarterly",
      blurb: "A 240-page print magazine on the future of nightlife and culture.",
      tone: "bg-acid",
    },
    {
      n: "04",
      tag: "Strategy · Identity",
      title: "Mara Biosciences",
      blurb: "Repositioning a longevity startup ahead of Series B announcement.",
      tone: "bg-[oklch(0.25_0.04_30)] text-background",
    },
  ];
  return (
    <section id="work" className="mx-auto max-w-7xl px-6 py-28">
      <div className="mb-16 flex items-end justify-between gap-8">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-foreground/60">
            ⟢ Selected work — 2024 / 2025
          </div>
          <h2 className="mt-4 font-display text-6xl font-light tracking-tight md:text-7xl">
            Recent <span className="italic">obsessions</span>.
          </h2>
        </div>
        <a
          href="#"
          className="hidden font-mono text-xs uppercase tracking-widest underline underline-offset-4 md:inline"
        >
          Full archive →
        </a>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {projects.map((p) => (
          <article
            key={p.n}
            className="group cursor-pointer border border-foreground bg-background transition hover:-translate-y-1 hover:shadow-[var(--shadow-brutal-lg)]"
          >
            <div className={`relative aspect-[4/3] overflow-hidden ${p.tone}`}>
              <div className="absolute left-5 top-5 font-mono text-xs uppercase tracking-widest opacity-80">
                {p.n} / {p.tag}
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display text-[8rem] font-light italic leading-none opacity-20 transition group-hover:opacity-40">
                  {p.title.split(" ")[0]}
                </span>
              </div>
              <div className="absolute bottom-5 right-5 rounded-full border border-current px-3 py-1 font-mono text-[10px] uppercase tracking-widest opacity-80">
                Case study →
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-6 border-t border-foreground p-6">
              <h3 className="font-display text-3xl font-light tracking-tight">{p.title}</h3>
              <p className="hidden max-w-xs text-right text-sm text-foreground/70 md:block">
                {p.blurb}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Manifesto() {
  return (
    <section id="manifesto" className="relative border-y border-foreground bg-foreground text-background">
      <div className="mx-auto max-w-5xl px-6 py-32 text-center">
        <div className="mb-8 font-mono text-xs uppercase tracking-widest text-background/60">
          ¶ Manifesto
        </div>
        <p className="font-display text-3xl font-light leading-tight text-balance md:text-5xl">
          We believe the safest brand is the riskiest investment.
          <br />
          <span className="italic text-acid">Average is invisible.</span> The future belongs to
          companies brave enough to have a point of view — and stubborn enough to defend it for
          a decade.
        </p>
        <div className="mt-12 font-mono text-xs uppercase tracking-widest text-background/60">
          — The Foundry, on a Tuesday
        </div>
      </div>
    </section>
  );
}

function Services() {
  const services = [
    {
      n: "S/01",
      title: "Brand Identity",
      points: ["Naming & verbal", "Logo & systems", "Guidelines"],
    },
    {
      n: "S/02",
      title: "Digital Product",
      points: ["UX & UI", "Design systems", "Front-end build"],
    },
    {
      n: "S/03",
      title: "Motion & Film",
      points: ["Brand films", "Launch campaigns", "3D & CGI"],
    },
    {
      n: "S/04",
      title: "Strategy",
      points: ["Positioning", "Messaging", "Naming workshops"],
    },
  ];
  return (
    <section id="services" className="mx-auto max-w-7xl px-6 py-28">
      <div className="grid gap-12 md:grid-cols-12">
        <div className="md:col-span-4">
          <div className="font-mono text-xs uppercase tracking-widest text-foreground/60">
            ⟢ What we do
          </div>
          <h2 className="mt-4 font-display text-5xl font-light tracking-tight md:text-6xl">
            Four lanes.<br />
            <span className="italic">Zero filler.</span>
          </h2>
          <p className="mt-6 max-w-sm text-foreground/70">
            We work in tight, senior teams. No account managers, no decks for the sake of decks
            — just makers in a room with you.
          </p>
        </div>
        <div className="md:col-span-8">
          <ul className="divide-y divide-foreground/20 border-y border-foreground/20">
            {services.map((s) => (
              <li
                key={s.n}
                className="group grid grid-cols-12 items-center gap-4 py-8 transition hover:bg-acid/30"
              >
                <span className="col-span-2 font-mono text-xs uppercase tracking-widest text-foreground/50">
                  {s.n}
                </span>
                <h3 className="col-span-5 font-display text-3xl font-light tracking-tight md:text-4xl">
                  {s.title}
                </h3>
                <ul className="col-span-4 hidden text-sm text-foreground/70 md:block">
                  {s.points.map((p) => (
                    <li key={p}>— {p}</li>
                  ))}
                </ul>
                <span className="col-span-1 text-right font-mono text-xl transition group-hover:translate-x-1">
                  →
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section id="contact" className="mx-auto max-w-7xl px-6 pb-32">
      <div className="relative overflow-hidden rounded-3xl border border-foreground bg-acid p-10 md:p-20">
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full border border-foreground/20" />
        <div className="absolute -bottom-32 -left-10 h-72 w-72 rounded-full border border-foreground/20" />
        <div className="relative grid gap-10 md:grid-cols-2 md:items-end">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest">⟢ Let's make something</div>
            <h2 className="mt-4 font-display text-6xl font-light leading-[0.9] tracking-tight md:text-8xl">
              Got a brand worth fighting for?
            </h2>
          </div>
          <div className="space-y-6">
            <p className="text-lg text-foreground/80">
              We take on six new projects a year. Tell us what you're building — we read every
              note within 48 hours.
            </p>
            <a
              href="mailto:hello@foundry.studio"
              className="group inline-flex items-center gap-3 rounded-full bg-foreground px-8 py-5 font-mono text-sm uppercase tracking-wider text-background transition hover:gap-5"
            >
              hello@foundry.studio
              <span>→</span>
            </a>
            <div className="font-mono text-xs uppercase tracking-widest text-foreground/70">
              Or DM @foundry.studio
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-foreground/20">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 py-10 font-mono text-xs uppercase tracking-widest text-foreground/60 md:flex-row md:items-center">
        <div className="flex items-center gap-2 text-foreground">
          <span className="inline-block h-2 w-2 rotate-45 bg-foreground" />
          Foundry Studio © 2026
        </div>
        <div className="flex flex-wrap gap-6">
          <a href="#" className="hover:text-foreground">Instagram</a>
          <a href="#" className="hover:text-foreground">Are.na</a>
          <a href="#" className="hover:text-foreground">LinkedIn</a>
          <a href="#" className="hover:text-foreground">Read.cv</a>
        </div>
        <div>Lisbon · 38.7°N / NYC · 40.7°N</div>
      </div>
    </footer>
  );
}
