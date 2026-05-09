import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { Database } from '../lib/database.types';

type Donation = Database['public']['Tables']['donations']['Row'];

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const compactRupiah = (n: number) => {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}K`;
  return rupiah(n);
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function Reports() {
  const { user } = useAuth();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const since = new Date(Date.now() - 7 * DAY_MS).toISOString();
    const { data } = await supabase
      .from('donations')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', since)
      .order('created_at', { ascending: false });
    setDonations(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const stats = useMemo(() => {
    const passed = donations.filter((d) => !d.blocked);
    const blocked = donations.filter((d) => d.blocked);
    const totalAmount = passed.reduce((sum, d) => sum + d.amount, 0);
    return {
      totalAmount,
      passed: passed.length,
      blocked: blocked.length,
      total: donations.length,
    };
  }, [donations]);

  const days = useMemo(() => {
    const map = new Map<string, { date: string; passed: number; blocked: number; amount: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * DAY_MS);
      const key = d.toISOString().slice(0, 10);
      map.set(key, { date: key, passed: 0, blocked: 0, amount: 0 });
    }
    donations.forEach((d) => {
      const key = d.created_at.slice(0, 10);
      const e = map.get(key);
      if (!e) return;
      if (d.blocked) e.blocked++;
      else {
        e.passed++;
        e.amount += d.amount;
      }
    });
    return Array.from(map.values());
  }, [donations]);

  const layerBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    donations.forEach((d) => {
      if (!d.blocked) return;
      const key = d.filter_layer ?? 'unknown';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([layer, count]) => ({ layer, count }))
      .sort((a, b) => b.count - a.count);
  }, [donations]);

  const maxDayPassed = Math.max(1, ...days.map((d) => d.passed));
  const maxDayBlocked = Math.max(1, ...days.map((d) => d.blocked));

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
          <span className="text-label text-tertiary-fixed-dim uppercase tracking-[0.2em] mb-2 block">Analytics</span>
          <h2 className="font-h1 text-h1 text-on-surface">Weekly Report</h2>
          <p className="text-on-surface-variant text-sm mt-2">
            Aggregate of the last 7 days. Updates as new donations arrive.
          </p>
        </div>
      </header>

      <div className="px-12 pb-12 max-w-7xl mx-auto space-y-12 blurFadeUp" style={{ animationDelay: '0.1s' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="liquid-glass p-6 rounded-xl flex flex-col gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 opacity-5 bg-gold rounded-bl-full" />
            <span className="material-symbols-outlined text-gold">account_balance_wallet</span>
            <div>
              <p className="text-label text-white/40 uppercase">Passed Total (7d)</p>
              <p className="text-h2 font-display text-on-surface">{compactRupiah(stats.totalAmount)}</p>
            </div>
          </div>

          <div className="liquid-glass p-6 rounded-xl flex flex-col gap-4">
            <span className="material-symbols-outlined text-tertiary">verified_user</span>
            <div>
              <p className="text-label text-white/40 uppercase">Passed Count</p>
              <p className="text-h2 font-display text-tertiary">{stats.passed.toLocaleString('id-ID')}</p>
            </div>
          </div>

          <div className="liquid-glass p-6 rounded-xl flex flex-col gap-4">
            <span className="material-symbols-outlined text-error">shield_with_heart</span>
            <div>
              <p className="text-label text-white/40 uppercase">Blocked Count</p>
              <p className="text-h2 font-display text-error">{stats.blocked.toLocaleString('id-ID')}</p>
            </div>
          </div>

          <div className="liquid-glass p-6 rounded-xl flex flex-col gap-4">
            <span className="material-symbols-outlined text-gold">stacked_bar_chart</span>
            <div>
              <p className="text-label text-white/40 uppercase">Total Events</p>
              <p className="text-h2 font-display text-on-surface">{stats.total.toLocaleString('id-ID')}</p>
            </div>
          </div>
        </div>

        <section className="liquid-glass rounded-xl p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold font-display tracking-tight flex items-center gap-3">
              <span className="material-symbols-outlined text-gold">calendar_view_week</span>
              Daily Breakdown
            </h3>
            <span className="text-[10px] uppercase tracking-widest text-white/40">Last 7 days</span>
          </div>

          {loading ? (
            <p className="text-white/30 text-sm py-4">Loading...</p>
          ) : stats.total === 0 ? (
            <p className="text-white/30 text-sm italic py-4">No donations in the last 7 days.</p>
          ) : (
            <div className="space-y-3">
              {days.map((d) => {
                const dateLabel = new Date(d.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                });
                return (
                  <div key={d.date} className="grid grid-cols-12 gap-4 items-center text-xs">
                    <div className="col-span-2 font-label uppercase tracking-widest text-white/60">{dateLabel}</div>
                    <div className="col-span-3 text-gold font-mono">{compactRupiah(d.amount)}</div>
                    <div className="col-span-3 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-tertiary rounded-full"
                          style={{ width: `${(d.passed / maxDayPassed) * 100}%` }}
                        />
                      </div>
                      <span className="text-tertiary w-8 text-right">{d.passed}</span>
                    </div>
                    <div className="col-span-3 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-error rounded-full"
                          style={{ width: `${(d.blocked / maxDayBlocked) * 100}%` }}
                        />
                      </div>
                      <span className="text-error w-8 text-right">{d.blocked}</span>
                    </div>
                    <div className="col-span-1 text-right text-white/40">{d.passed + d.blocked}</div>
                  </div>
                );
              })}
              <div className="grid grid-cols-12 gap-4 pt-4 mt-2 border-t border-white/5 text-[10px] uppercase tracking-widest text-white/30">
                <div className="col-span-2">Date</div>
                <div className="col-span-3">Passed (IDR)</div>
                <div className="col-span-3">Passed Count</div>
                <div className="col-span-3">Blocked Count</div>
                <div className="col-span-1 text-right">All</div>
              </div>
            </div>
          )}
        </section>

        {layerBreakdown.length > 0 && (
          <section className="liquid-glass rounded-xl p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold font-display tracking-tight flex items-center gap-3">
                <span className="material-symbols-outlined text-gold">filter_alt</span>
                Filter Layer Breakdown
              </h3>
              <span className="text-[10px] uppercase tracking-widest text-white/40">Which layer caught what</span>
            </div>
            <div className="space-y-3">
              {layerBreakdown.map((row) => {
                const pct = (row.count / stats.blocked) * 100;
                return (
                  <div key={row.layer} className="grid grid-cols-12 gap-4 items-center text-xs">
                    <div className="col-span-3 font-label uppercase tracking-widest text-white/80">{row.layer}</div>
                    <div className="col-span-7 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-error rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="col-span-1 text-error font-mono text-right">{row.count}</div>
                    <div className="col-span-1 text-white/40 text-right">{pct.toFixed(0)}%</div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-gold/5 blur-[120px] -z-10 rounded-full" />
    </Layout>
  );
}
