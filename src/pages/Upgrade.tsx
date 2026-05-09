import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';

type Benefit = {
  icon: string;
  title: string;
  description: string;
};

const BENEFITS: Benefit[] = [
  {
    icon: 'all_inclusive',
    title: 'Unlimited Blocklist',
    description: 'Lift the entry cap on your custom blocklist. Add as many keywords, brands, and patterns as your community needs.',
  },
  {
    icon: 'psychology',
    title: 'Advanced ML Shield',
    description: 'Tap into the larger BERT model with deeper context understanding and lower false-positive rates on edge-case spam.',
  },
  {
    icon: 'palette',
    title: 'Custom Overlay Themes',
    description: 'Match your stream brand: custom fonts, colors, animations, and positioning for the donation alert overlay.',
  },
  {
    icon: 'support_agent',
    title: 'Priority Support',
    description: 'Direct line to the Phylaxify team. Same-day responses on bugs, feature requests, and integration issues.',
  },
  {
    icon: 'monitoring',
    title: 'Detailed Analytics',
    description: 'Monthly trend reports, donator cohort analysis, top blocked patterns, and exportable insights beyond the weekly view.',
  },
  {
    icon: 'webhook',
    title: 'API & Webhook Access',
    description: 'Hook Phylaxify into your own automations: Discord pings, custom moderation flows, or third-party analytics.',
  },
];

export function Upgrade() {
  return (
    <Layout>
      <header className="flex justify-between items-end px-12 pt-12 pb-8 blurFadeUp">
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.3em] text-white/40 hover:text-gold transition-colors mb-4"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Dashboard
          </Link>
          <span className="text-label text-tertiary-fixed-dim uppercase tracking-[0.2em] mb-2 block">Premium Access</span>
          <h2 className="font-h1 text-h1 text-on-surface">Upgrade to Phylaxify Premium</h2>
          <p className="text-on-surface-variant text-sm mt-2 max-w-2xl">
            Deeper protection, broader integration, and priority care. Built for streamers who treat their channel like a craft.
          </p>
        </div>
      </header>

      <div className="px-12 pb-12 max-w-7xl mx-auto space-y-12 blurFadeUp" style={{ animationDelay: '0.1s' }}>
        <section className="relative liquid-glass rounded-2xl p-8 border border-gold/30 overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 greek-watermark-laurel bg-gold opacity-10 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-gold">construction</span>
              </div>
              <div>
                <p className="font-label text-[10px] uppercase tracking-[0.3em] text-gold mb-1">Work in Progress</p>
                <h3 className="font-display text-xl text-on-surface">Premium is launching soon</h3>
                <p className="text-on-surface-variant text-sm mt-1">
                  We're polishing the Premium tier. Browse the benefits below; checkout opens once the rollout is ready.
                </p>
              </div>
            </div>
            <span className="self-start md:self-center font-label text-[10px] uppercase tracking-widest px-4 py-2 rounded-full bg-gold/10 border border-gold/30 text-gold whitespace-nowrap">
              Coming Soon
            </span>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-gold">stars</span>
            <h3 className="text-xl font-bold font-display tracking-tight">What you get with Premium</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="liquid-glass p-6 rounded-xl border border-white/5 hover:border-gold/30 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-gold/5 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-12 h-12 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center mb-4 group-hover:bg-gold/15 transition-all">
                  <span className="material-symbols-outlined text-gold">{b.icon}</span>
                </div>
                <h4 className="font-display text-lg text-on-surface mb-2">{b.title}</h4>
                <p className="text-on-surface-variant text-sm leading-relaxed">{b.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="liquid-glass rounded-2xl p-10 text-center border border-white/10 relative overflow-hidden">
          <div className="absolute inset-0 greek-meander opacity-5 pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center gap-4">
            <p className="font-label text-[10px] uppercase tracking-[0.3em] text-white/40">Ready when you are</p>
            <h3 className="font-display text-2xl md:text-3xl text-on-surface">Premium checkout is not live yet.</h3>
            <p className="text-on-surface-variant text-sm max-w-xl">
              Want to be first in line? Reach out and we'll notify you the moment Premium opens.
            </p>
            <button
              type="button"
              disabled
              className="mt-2 px-10 py-4 rounded-xl bg-gold/40 text-[#0A0A0A]/60 font-bold uppercase tracking-widest text-sm cursor-not-allowed flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">lock</span>
              Coming Soon
            </button>
            <a
              href="https://github.com/AxelS27/Phylaxify/issues/new?title=Premium%20interest"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-label uppercase tracking-widest text-gold hover:underline"
            >
              Notify me on GitHub →
            </a>
          </div>
        </section>
      </div>

      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-gold/5 blur-[120px] -z-10 rounded-full" />
    </Layout>
  );
}
