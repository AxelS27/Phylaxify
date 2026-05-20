import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useProfile } from '../lib/profile';
import { isActivePremium, PREMIUM_PRICE_IDR } from '../lib/plan';

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        options: {
          onSuccess?: (result: unknown) => void;
          onPending?: (result: unknown) => void;
          onError?: (result: unknown) => void;
          onClose?: () => void;
        },
      ) => void;
    };
  }
}

type PaymentStatus = 'idle' | 'loading' | 'pending' | 'success' | 'error';

type Benefit = { icon: string; title: string; description: string; premium: boolean };

const BENEFITS: Benefit[] = [
  {
    icon: 'block',
    title: 'Extended Blocklist',
    description: 'Up to 500 custom words (vs 50 on Free). Cover more brands, slang, and emerging spam patterns.',
    premium: true,
  },
  {
    icon: 'psychology',
    title: 'Deep Learning Shield',
    description: 'Your donations are scored by a deep neural network for deeper context and fewer false positives.',
    premium: true,
  },
  {
    icon: 'analytics',
    title: 'Detailed Analytics',
    description: 'Monthly trend reports, top blocked patterns, and exportable insights.',
    premium: false,
  },
  {
    icon: 'palette',
    title: 'Custom Overlay Themes',
    description: 'Custom fonts, colors, and animations for your donation alert.',
    premium: false,
  },
  {
    icon: 'support_agent',
    title: 'Priority Support',
    description: 'Same-day responses on bugs and feature requests.',
    premium: false,
  },
  {
    icon: 'webhook',
    title: 'API & Webhook Access',
    description: 'Hook Phylaxify into Discord, custom moderation flows, or third-party analytics.',
    premium: false,
  },
];


export function Upgrade() {
  const { profile, refresh } = useProfile();
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [snapReady, setSnapReady] = useState(false);

  const isPremium = isActivePremium(profile?.plan ?? 'free', profile?.plan_expires_at ?? null);
  const expiresAt = profile?.plan_expires_at ? new Date(profile.plan_expires_at) : null;

  // Load Midtrans SNAP JS
  useEffect(() => {
    const isProd = import.meta.env.VITE_MIDTRANS_IS_PRODUCTION === 'true';
    const clientKey = import.meta.env.VITE_MIDTRANS_CLIENT_KEY as string | undefined;
    if (!clientKey) return;

    const existing = document.getElementById('midtrans-snap-script');
    if (existing) {
      setSnapReady(true);
      return;
    }

    const script = document.createElement('script');
    script.id = 'midtrans-snap-script';
    script.src = isProd
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js';
    script.setAttribute('data-client-key', clientKey);
    script.onload = () => setSnapReady(true);
    script.onerror = () => console.error('[Upgrade] Failed to load Midtrans SNAP script');
    document.head.appendChild(script);

    return () => {
      // Keep script in DOM — removing it would break snap on re-mount
    };
  }, []);

  async function handleSubscribe() {
    if (!snapReady) {
      setErrorMsg('Payment gateway is loading. Try again in a moment.');
      return;
    }

    setStatus('loading');
    setErrorMsg(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch('/api/payment/create-transaction', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const json = await res.json() as {
        snap_token?: string;
        error?: string;
        detail?: string;
        expires_at?: string;
      };

      if (!res.ok) {
        if (json.error === 'already_premium') {
          setErrorMsg(`Sudah aktif sampai ${json.expires_at ? new Date(json.expires_at).toLocaleDateString('id-ID') : '-'}`);
          setStatus('idle');
          return;
        }
        if (json.error === 'midtrans_error') {
          throw new Error(`Midtrans: ${json.detail ?? 'unknown error'}`);
        }
        throw new Error(json.error ?? 'Unknown error');
      }

      if (!json.snap_token) throw new Error('No SNAP token received');

      setStatus('idle');
      window.snap!.pay(json.snap_token, {
        onSuccess: () => {
          setStatus('success');
          // Poll until notification webhook updates the plan (up to 30s)
          let attempts = 0;
          const poll = () => {
            attempts++;
            refresh();
            if (attempts < 15) setTimeout(poll, 2000);
          };
          setTimeout(poll, 1500);
        },
        onPending: () => {
          setStatus('pending');
        },
        onError: () => {
          setStatus('error');
          setErrorMsg('Payment failed. Please try again.');
        },
        onClose: () => {
          if (status === 'loading') setStatus('idle');
        },
      });
    } catch (err) {
      setStatus('error');
      setErrorMsg((err as Error).message);
    }
  }

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
            Deeper protection, broader blocklist, and a smarter ML shield. Built for streamers who take their community seriously.
          </p>
        </div>
      </header>

      <div className="px-12 pb-12 max-w-7xl mx-auto space-y-12 blurFadeUp" style={{ animationDelay: '0.1s' }}>

        {/* Status banners */}
        {status === 'success' && (
          <div className="flex items-center gap-4 px-6 py-4 rounded-xl border border-tertiary/30 bg-tertiary/10">
            <span className="material-symbols-outlined text-tertiary text-2xl">verified</span>
            <div>
              <p className="font-bold text-tertiary">Premium activated!</p>
              <p className="text-xs text-white/60 mt-0.5">Your plan is now active. Enjoy the expanded blocklist and DL model.</p>
            </div>
          </div>
        )}
        {status === 'pending' && (
          <div className="flex items-center gap-4 px-6 py-4 rounded-xl border border-gold/30 bg-gold/10">
            <span className="material-symbols-outlined text-gold text-2xl">pending</span>
            <div>
              <p className="font-bold text-gold">Payment pending</p>
              <p className="text-xs text-white/60 mt-0.5">Your payment is being processed. Premium will activate once confirmed.</p>
            </div>
          </div>
        )}
        {errorMsg && (
          <div className="flex items-center gap-4 px-6 py-4 rounded-xl border border-error/30 bg-error/10">
            <span className="material-symbols-outlined text-error text-2xl">error</span>
            <p className="text-sm text-error">{errorMsg}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Pricing card */}
          <div className="lg:col-span-1 liquid-glass rounded-2xl p-8 border border-gold/30 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-gold/10 blur-[60px] rounded-full pointer-events-none" />
            <div className="relative z-10">
              <p className="font-label text-[10px] uppercase tracking-[0.3em] text-gold mb-4">Phylaxify Premium</p>

              {isPremium ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-gold">verified</span>
                    <span className="font-bold text-gold uppercase tracking-widest text-sm">Active</span>
                  </div>
                  {expiresAt && (
                    <div className="p-4 bg-white/5 rounded-xl">
                      <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Expires</p>
                      <p className="text-sm font-bold text-on-surface">
                        {expiresAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-[10px] text-white/30 mt-1">
                        {Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days remaining
                      </p>
                    </div>
                  )}
                  <button
                    disabled
                    className="w-full py-3 rounded-xl border border-error/20 text-error/50 font-label text-xs uppercase tracking-widest cursor-not-allowed opacity-50"
                  >
                    Cancel Subscription
                  </button>
                  <p className="text-[9px] text-white/20 text-center uppercase tracking-widest">
                    Contact support to cancel
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-black font-display text-on-surface">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(PREMIUM_PRICE_IDR)}
                      </span>
                    </div>
                    <p className="text-white/40 text-xs mt-1 font-label uppercase tracking-widest">per month</p>
                  </div>

                  <ul className="space-y-3">
                    {[
                      '500 blocklist words',
                      'Deep Learning ML model',
                      'All free features included',
                    ].map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-white/70">
                        <span className="material-symbols-outlined text-gold text-sm">check</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={handleSubscribe}
                    disabled={status === 'loading' || !snapReady}
                    className="w-full bg-gold text-[#0A0A0A] py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(201,168,76,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {status === 'loading' ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">lock_open</span>
                        Subscribe Now
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-white/30 text-center uppercase tracking-widest">
                    Secured via Midtrans · Cancel anytime
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Benefits grid */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-gold">stars</span>
              <h3 className="text-xl font-bold font-display tracking-tight">What you get</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {BENEFITS.map((b) => (
                <div
                  key={b.title}
                  className={`liquid-glass p-6 rounded-xl border transition-all group relative overflow-hidden ${
                    b.premium
                      ? 'border-gold/30 hover:border-gold/50'
                      : 'border-white/5 hover:border-white/10'
                  }`}
                >
                  {b.premium && (
                    <div className="absolute top-3 right-3">
                      <span className="px-2 py-0.5 rounded-full bg-gold/10 border border-gold/30 text-[9px] font-bold text-gold uppercase tracking-widest">
                        Premium
                      </span>
                    </div>
                  )}
                  <div className="w-10 h-10 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-gold text-lg">{b.icon}</span>
                  </div>
                  <h4 className="font-display text-base text-on-surface mb-1">{b.title}</h4>
                  <p className="text-on-surface-variant text-xs leading-relaxed">{b.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-gold/5 blur-[120px] -z-10 rounded-full" />
    </Layout>
  );
}
