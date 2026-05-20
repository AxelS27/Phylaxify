import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useProfile } from '../lib/profile';
import { isActivePremium } from '../lib/plan';
import type { Database } from '../lib/database.types';

type Donation = Database['public']['Tables']['donations']['Row'];

type Stats = {
  totalAmount: number;
  blocked: number;
  passed: number;
};

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const compactRupiah = (n: number) => {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}K`;
  return rupiah(n);
};

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m} Minutes Ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} Hours Ago`;
  return `${Math.floor(h / 24)} Days Ago`;
}

export function Dashboard() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const isPremium = isActivePremium(profile?.plan ?? 'free', profile?.plan_expires_at ?? null);
  const [stats, setStats] = useState<Stats>({ totalAmount: 0, blocked: 0, passed: 0 });
  const [recent, setRecent] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [allRes, blockedRes, passedRes, recentRes] = await Promise.all([
      supabase.from('donations').select('amount').eq('user_id', user.id).eq('blocked', false),
      supabase.from('donations').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('blocked', true),
      supabase.from('donations').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('blocked', false),
      supabase.from('donations').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    ]);

    const totalAmount = (allRes.data ?? []).reduce((sum, r) => sum + (r.amount ?? 0), 0);
    setStats({
      totalAmount,
      blocked: blockedRes.count ?? 0,
      passed: passedRes.count ?? 0,
    });
    setRecent(recentRes.data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`donations-dash-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'donations', filter: `user_id=eq.${user.id}` },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  return (
    <Layout>
      <header className="flex justify-between items-center px-12 py-6 sticky top-0 bg-background-color/80 backdrop-blur-md z-40">
        <div className="flex items-center gap-6">
          <h2 className="font-h2 text-h2 text-on-surface font-bold tracking-tight">Home</h2>
          <div className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase flex items-center gap-1 ${profile?.filter_enabled ? 'bg-gold text-[#0A0A0A]' : 'bg-error/20 text-error'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${profile?.filter_enabled ? 'bg-[#0A0A0A]' : 'bg-error'}`}></span>
            Filter {profile?.filter_enabled ? 'ON' : 'OFF'}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="flex items-center justify-end gap-2 mb-0.5">
              {isPremium && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold text-[#0A0A0A] text-[9px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(201,168,76,0.4)]">
                  <span className="material-symbols-outlined text-[10px]" style={{ fontSize: '10px' }}>star</span>
                  Premium
                </span>
              )}
              <p className="text-xs text-white/40 font-label uppercase">Guardian</p>
            </div>
            <p className="text-sm font-bold text-on-surface">@{profile?.username ?? '...'}</p>
          </div>
          <div className={`w-10 h-10 rounded-full bg-[#111111] flex items-center justify-center relative ${isPremium ? 'border-2 border-gold shadow-[0_0_12px_rgba(201,168,76,0.5)]' : 'border border-gold/50'}`}>
            <span className="font-display text-gold text-lg uppercase">
              {(profile?.username ?? '?').slice(0, 1)}
            </span>
            {isPremium && (
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-gold flex items-center justify-center shadow-md">
                <span className="material-symbols-outlined text-[#0A0A0A]" style={{ fontSize: '10px' }}>star</span>
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="px-12 pb-12 max-w-7xl mx-auto space-y-12 blurFadeUp">
        <section className="relative">
          <div className="absolute -left-8 -top-8 opacity-10 pointer-events-none">
            <svg fill="none" height="120" viewBox="0 0 100 100" width="120" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 10C30 10 10 30 10 50C10 70 30 90 50 90C70 90 90 70 90 50" stroke="#C9A84C" strokeDasharray="4 4" strokeWidth="2"></path>
              <path d="M40 30L30 40M45 25L35 35M50 20L40 30" stroke="#C9A84C" strokeWidth="1"></path>
            </svg>
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="font-h1 text-h1 text-on-surface">
              Hello, <span className="text-gold font-bold">{profile?.username ?? '...'}</span>
            </h1>
            <p className="text-on-surface-variant text-body max-w-xl">
              Your protection gate is {profile?.filter_enabled ? 'active' : 'inactive'}. Incoming donations will be {profile?.filter_enabled ? 'filtered before appearing' : 'displayed immediately without filter'}.
            </p>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="liquid-glass p-6 rounded-xl flex flex-col gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 opacity-5 bg-gold rounded-bl-full"></div>
            <span className="material-symbols-outlined text-gold">account_balance_wallet</span>
            <div>
              <p className="text-label text-white/40 uppercase">Total Donations (Passed)</p>
              <p className="text-h2 font-display text-on-surface">{compactRupiah(stats.totalAmount)}</p>
            </div>
          </div>

          <div className="liquid-glass p-6 rounded-xl flex flex-col gap-4">
            <span className="material-symbols-outlined text-error">shield_with_heart</span>
            <div>
               <p className="text-label text-white/40 uppercase">Blocked</p>
               <p className="text-h2 font-display text-error">{stats.blocked.toLocaleString('id-ID')}</p>
            </div>
          </div>

          <div className="liquid-glass p-6 rounded-xl flex flex-col gap-4">
            <span className="material-symbols-outlined text-tertiary">verified_user</span>
            <div>
               <p className="text-label text-white/40 uppercase">Passed</p>
               <p className="text-h2 font-display text-tertiary">{stats.passed.toLocaleString('id-ID')}</p>
            </div>
          </div>

          <div className="liquid-glass p-6 rounded-xl flex flex-col gap-4">
            <span className="material-symbols-outlined text-gold">timer</span>
            <div>
               <p className="text-label text-white/40 uppercase">Status</p>
               <p className={`text-h2 font-display ${profile?.filter_enabled ? 'text-on-surface' : 'text-error'}`}>
                  {profile?.filter_enabled ? 'Active' : 'Off'}
               </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 liquid-glass rounded-xl p-8">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-xl font-bold font-display tracking-tight flex items-center gap-3">
                 <span className="material-symbols-outlined text-gold">history</span>
                 Recent Activity
               </h3>
               <Link to="/offerings" className="text-xs font-label uppercase text-gold hover:underline transition-all">View All</Link>
            </div>

            <div className="space-y-1">
               {loading ? (
                 <p className="text-white/30 text-sm py-4">Loading...</p>
               ) : recent.length === 0 ? (
                 <p className="text-white/30 text-sm italic py-4">No donations yet. Set up the webhook URL in Saweria to start receiving.</p>
               ) : (
                 recent.map((d) => (
                   <div key={d.id} className="grid grid-cols-12 items-center py-4 px-4 hover:bg-white/5 rounded-lg transition-colors border-b border-white/5 last:border-0">
                      <div className="col-span-1 flex justify-center">
                         {d.blocked ? (
                            <span className="material-symbols-outlined text-error">cancel</span>
                         ) : (
                            <span className="material-symbols-outlined text-tertiary">check_circle</span>
                         )}
                      </div>
                      <div className="col-span-3">
                         <p className="text-sm font-bold truncate">{d.donator_name}</p>
                         <p className="text-[10px] text-white/40 uppercase">{d.provider}</p>
                      </div>
                      <div className="col-span-2">
                         <p className={`text-sm font-bold ${d.blocked ? 'text-white/20' : 'text-gold'}`}>{rupiah(d.amount)}</p>
                      </div>
                      <div className="col-span-4">
                         <p className={`text-xs truncate ${d.blocked ? 'text-error/60 italic' : 'text-on-surface-variant'}`}>
                            {d.blocked ? `Blocked: ${d.filter_reason ?? 'spam detected'}` : (d.message ?? '-')}
                         </p>
                      </div>
                      <div className="col-span-2 text-right">
                         <p className="text-[10px] text-white/40 uppercase">{timeAgo(d.created_at)}</p>
                      </div>
                   </div>
                 ))
               )}
            </div>
          </div>

          <div className="flex flex-col gap-8">
            <div className="bg-[#111111] border-l-4 border-gold p-6 rounded-r-xl relative overflow-hidden">
               <div className="absolute -right-4 -bottom-4 opacity-10">
                 <span className="material-symbols-outlined text-6xl text-gold">lightbulb</span>
               </div>
               <h4 className="font-bold text-gold mb-2 uppercase tracking-widest text-xs">Pro Tip</h4>
               <p className="text-sm text-on-surface-variant leading-relaxed">Enable "Smart Delay" to give the AI Shield time to analyze repeated messages in short durations.</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <Link to="/reports" className="liquid-glass group p-6 rounded-xl flex items-center justify-between hover:bg-white/5 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gold/10 flex items-center justify-center text-gold">
                    <span className="material-symbols-outlined">analytics</span>
                  </div>
                  <div>
                    <p className="font-bold">Weekly Report</p>
                    <p className="text-[10px] text-white/40 uppercase">Last 7 Days</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-white/20 group-hover:translate-x-1 group-hover:text-gold transition-all">arrow_forward</span>
              </Link>
            </div>

            <div className="flex-1 flex items-end justify-center opacity-10">
              <svg className="fill-gold" fill="none" height="100" viewBox="0 0 200 100" width="200" xmlns="http://www.w3.org/2000/svg">
                <path d="M100 90C60 90 20 70 10 30M100 90C140 90 180 70 190 30" stroke="#C9A84C" strokeWidth="2"></path>
                <circle cx="10" cy="30" r="4"></circle>
                <circle cx="30" cy="50" r="4"></circle>
                <circle cx="60" cy="80" r="4"></circle>
                <circle cx="140" cy="80" r="4"></circle>
                <circle cx="170" cy="50" r="4"></circle>
                <circle cx="190" cy="30" r="4"></circle>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-gold/5 blur-[120px] -z-10 rounded-full"></div>
      <div className="fixed bottom-0 left-64 w-[300px] h-[300px] bg-primary-container/5 blur-[100px] -z-10 rounded-full"></div>
    </Layout>
  );
}
