import Header from '@/components/Header'
import ServiceCard from '@/components/ServiceCard'
import AnimatedGradientText from '@/components/magicui/animated-gradient-text'
import services from '@/services.json'

export default function Home() {
  const live        = services.filter(s => s.url)
  const suggestions = services.filter(s => !s.url)

  return (
    <div className="min-h-screen bg-bg">
      <Header />

      <main className="mx-auto max-w-6xl px-6 pb-32">

        {/* Hero */}
        <section className="relative py-24 text-center overflow-hidden">
          {/* Dot grid background */}
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage: 'radial-gradient(circle, #C97B4B 1px, transparent 1px)',
              backgroundSize: '28px 28px',
              maskImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 100%)',
            }}
          />

          <div className="relative z-10">
            {/* Live badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-white/70 backdrop-blur-sm px-4 py-1.5 text-sm font-semibold text-accent shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              Now live: CV Generator
            </div>

            <h1 className="text-5xl font-extrabold tracking-tight sm:text-[64px] leading-[1.1]">
              <AnimatedGradientText>Recruitment AI</AnimatedGradientText>
              <br />
              <span className="text-primary">Tools for NC</span>
            </h1>

            <p className="mx-auto mt-6 max-w-lg text-[17px] text-tx-muted leading-relaxed">
              A growing suite of intelligent tools — from instant CV generation
              to semantic consultant matching.
            </p>
          </div>
        </section>

        {/* Live tools */}
        {live.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-xs font-bold uppercase tracking-widest text-accent">Live now</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {live.map((s, i) => <ServiceCard key={s.name} service={s} index={i} />)}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-xs font-bold uppercase tracking-widest text-tx-muted">On the roadmap</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {suggestions.map((s, i) => <ServiceCard key={s.name} service={s} index={live.length + i} />)}
            </div>
          </div>
        )}

      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-tx-muted">
        © 2026 Matchcard · Built for Nordic Commerce
      </footer>
    </div>
  )
}
