import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../lib/auth';
import { useProfile, updateProfile } from '../lib/profile';
import { overlayUrl, saweriaWebhookUrl } from '../lib/urls';

type TabType = 'filter' | 'overlay' | 'identity';

export function Settings() {
  const { user } = useAuth();
  const { profile, refresh } = useProfile();

  const [activeTab, setActiveTab] = useState<TabType>('filter');
  const [username, setUsername] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'overlay' | 'webhook' | null>(null);

  useEffect(() => {
    if (profile) setUsername(profile.username);
  }, [profile]);

  async function saveIdentity() {
    if (!user) return;
    setError(null);
    setSavingProfile(true);
    const { error: err } = await updateProfile(user.id, { username: username.trim() });
    setSavingProfile(false);
    if (err) {
      setError(err);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    refresh();
  }

  async function toggleFilter() {
    if (!user || !profile) return;
    const next = !profile.filter_enabled;
    const { error: err } = await updateProfile(user.id, { filter_enabled: next });
    if (err) {
      setError(err);
      return;
    }
    refresh();
  }

  async function copyTo(target: 'overlay' | 'webhook') {
    if (!profile) return;
    const text =
      target === 'overlay'
        ? overlayUrl(profile.overlay_token)
        : saweriaWebhookUrl(profile.webhook_token);
    await navigator.clipboard.writeText(text);
    setCopied(target);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-12 min-h-screen">
        <header className="mb-12 relative overflow-hidden p-8 rounded-2xl liquid-glass blurFadeUp border border-white/5">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 greek-watermark-laurel opacity-20 -mr-20 -mt-20"></div>
          <h1 className="font-h1 text-h1 text-white mb-2 relative z-10">Settings</h1>
          <p className="text-on-surface-variant font-body relative z-10 uppercase tracking-[0.4em] text-[10px] opacity-60">System Configuration & Smart Tuning</p>
        </header>

        <div className="flex gap-12 border-b border-white/10 mb-12 blurFadeUp" style={{animationDelay: '0.1s'}}>
          {(['filter', 'overlay', 'identity'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 font-label uppercase tracking-[0.4em] text-[10px] transition-all relative ${
                activeTab === tab 
                ? 'text-gold' 
                : 'text-white/40 hover:text-white'
              }`}
            >
              {tab === 'identity' ? 'Identity & Account' : tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gold shadow-[0_0_10px_rgba(201,168,76,0.5)]"></div>
              )}
            </button>
          ))}
        </div>

        <div className="blurFadeUp" style={{animationDelay: '0.2s'}}>
          {activeTab === 'filter' && (
            <div className="grid grid-cols-12 gap-8">
              <div className="col-span-12 lg:col-span-7 liquid-glass p-10 rounded-3xl flex flex-col justify-between border border-gold/10 relative overflow-hidden">
                <div className="absolute -bottom-12 -right-12 w-48 h-48 greek-meander opacity-5"></div>
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="font-h2 text-2xl text-white uppercase tracking-widest">Global Shield</h3>
                      <p className={`text-[11px] font-black uppercase tracking-[0.2em] mt-1 ${profile?.filter_enabled ? 'text-gold' : 'text-error'}`}>
                         Protection Status: {profile?.filter_enabled ? 'Active' : 'Offline'}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer transform scale-[1.2]">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={profile?.filter_enabled ?? false}
                        onChange={toggleFilter}
                      />
                      <div className="w-14 h-7 bg-[#222222] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gold"></div>
                    </label>
                  </div>
                  <div className="space-y-6">
                    <p className="text-white/50 font-body text-base leading-relaxed">
                      The core defensive layer. When enabled, every incoming donation is passed through the triple-layer filter: 
                      Custom Blocklist, Regex Patterns, and BERT Machine Learning.
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                          <h4 className="text-[10px] text-gold font-bold uppercase tracking-widest mb-1">Layer 1 & 2</h4>
                          <p className="text-xs text-white/60">Keyword & Pattern Matching</p>
                       </div>
                       <div className="p-5 bg-gold/5 rounded-2xl border border-gold/20">
                          <h4 className="text-[10px] text-gold font-bold uppercase tracking-widest mb-1">Layer 3 (ML)</h4>
                          <p className="text-xs text-white/60">BERT Neural Protection</p>
                       </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-12 lg:col-span-5 liquid-glass p-10 rounded-3xl flex flex-col gap-8">
                <h3 className="font-h2 text-xl text-white flex items-center gap-3">
                  <span className="material-symbols-outlined text-gold">tune</span>
                  Sentinel Tuning
                </h3>
                <div className="space-y-8">
                  <div className="space-y-4">
                    <label className="font-label text-[10px] text-white/40 uppercase tracking-[0.2em]">Sensitivity Level</label>
                    <div className="flex gap-2">
                      <button className="flex-1 py-4 rounded-xl border border-white/10 text-white/40 text-[10px] uppercase font-bold hover:bg-white/5 transition-all">Loose</button>
                      <button className="flex-1 py-4 rounded-xl bg-gold text-black text-[10px] uppercase font-bold shadow-[0_0_15px_rgba(201,168,76,0.3)]">Normal</button>
                      <button className="flex-1 py-4 rounded-xl border border-white/10 text-white/40 text-[10px] uppercase font-bold hover:bg-white/5 transition-all">Strict</button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="font-label text-[10px] text-white/40 uppercase tracking-[0.2em]">Filter Scope</label>
                    <div className="space-y-3">
                       <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/5">
                          <span className="material-symbols-outlined text-gold text-sm">check_circle</span>
                          <span className="text-xs text-white/80">Filter Donation Message</span>
                       </div>
                       <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/5">
                          <span className="material-symbols-outlined text-gold text-sm">check_circle</span>
                          <span className="text-xs text-white/80">Filter Donator Name</span>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'overlay' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <section className="lg:col-span-8 liquid-glass p-10 rounded-3xl space-y-10">
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-gold">tv</span>
                  <h3 className="font-h2 text-xl text-white uppercase tracking-widest">OBS Integration</h3>
                </div>
                
                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="font-label text-[10px] text-white/40 uppercase tracking-[0.3em]">Direct Overlay URL</label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        readOnly
                        value={profile ? overlayUrl(profile.overlay_token) : ''}
                        className="flex-grow bg-[#111111] border border-white/10 rounded-xl px-6 py-4 text-gold text-xs font-mono"
                      />
                      <button
                        onClick={() => copyTo('overlay')}
                        className="px-6 bg-gold/10 text-gold rounded-xl border border-gold/20 hover:bg-gold/20 transition-all flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined">{copied === 'overlay' ? 'check' : 'content_copy'}</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest">Recommended size: 1920x1080 (Custom CSS: None)</p>
                  </div>

                  <div className="space-y-3 pt-6 border-t border-white/5">
                    <label className="font-label text-[10px] text-white/40 uppercase tracking-[0.3em]">Webhook Endpoint</label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        readOnly
                        value={profile ? saweriaWebhookUrl(profile.webhook_token) : ''}
                        className="flex-grow bg-[#111111] border border-white/10 rounded-xl px-6 py-4 text-white/60 text-xs font-mono"
                      />
                      <button
                        onClick={() => copyTo('webhook')}
                        className="px-6 bg-white/5 text-white/60 rounded-xl border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined">{copied === 'webhook' ? 'check' : 'content_copy'}</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest">Connect to Saweria or Trakteer webhook settings.</p>
                  </div>
                </div>
              </section>

              <div className="lg:col-span-4 space-y-8">
                <div className="liquid-glass p-8 rounded-3xl border border-emerald-500/10">
                   <h4 className="font-label text-emerald-500 uppercase tracking-[0.2em] mb-4">Setup Guide</h4>
                   <ol className="space-y-4 text-xs text-white/60 font-body">
                      <li className="flex gap-3"><span className="text-emerald-500 font-black">1.</span> Copy the Overlay URL</li>
                      <li className="flex gap-3"><span className="text-emerald-500 font-black">2.</span> Add "Browser Source" in OBS</li>
                      <li className="flex gap-3"><span className="text-emerald-500 font-black">3.</span> Paste URL & set resolution</li>
                      <li className="flex gap-3"><span className="text-emerald-500 font-black">4.</span> Refresh source if token resets</li>
                   </ol>
                </div>
                
                <div className="liquid-glass p-8 rounded-3xl bg-error/5 border border-error/20">
                   <h4 className="font-label text-error uppercase tracking-[0.2em] mb-2">Caution</h4>
                   <p className="text-[10px] text-error/60 leading-relaxed uppercase tracking-wider">
                      Never reveal your full overlay URL on screen. Regenerate token immediately if compromised.
                   </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'identity' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
               <section className="lg:col-span-4 liquid-glass p-10 rounded-3xl flex flex-col items-center text-center gap-8 h-fit">
                  <div className="w-40 h-40 rounded-full border-4 border-gold/20 p-1 overflow-hidden bg-[#111111] flex items-center justify-center relative">
                     <div className="absolute inset-0 bg-gold/5 animate-pulse"></div>
                     <span className="font-display text-7xl text-gold uppercase relative z-10 drop-shadow-2xl">
                        {(profile?.username ?? '?').slice(0, 1)}
                     </span>
                  </div>
                  <div className="space-y-2">
                     <h3 className="text-white font-bold text-xl uppercase tracking-widest">@{profile?.username}</h3>
                     <p className="text-white/30 text-[10px] uppercase tracking-[0.3em]">Silent Guardian</p>
                  </div>
                  <div className="w-full pt-6 border-t border-white/5 flex flex-col gap-3">
                     <div className="flex justify-between text-[10px] uppercase tracking-widest text-white/40">
                        <span>Status</span>
                        <span className="text-gold font-bold">Authenticated</span>
                     </div>
                     <div className="flex justify-between text-[10px] uppercase tracking-widest text-white/40">
                        <span>Joined</span>
                        <span className="text-white/60">April 2026</span>
                     </div>
                  </div>
               </section>

               <div className="lg:col-span-8 space-y-8">
                  <section className="liquid-glass p-10 rounded-3xl">
                    <h3 className="font-h2 text-xl text-white mb-8 uppercase tracking-widest">Oracle Identity</h3>
                    <div className="space-y-8">
                      <div className="space-y-2">
                        <label className="font-label text-[10px] text-white/40 uppercase tracking-[0.2em]">Display Name</label>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full bg-[#111111] border border-white/10 rounded-xl px-6 py-4 text-white focus:border-gold/40 transition-all font-body"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="font-label text-[10px] text-white/40 uppercase tracking-[0.2em]">Email Address</label>
                        <input
                          type="text"
                          readOnly
                          value={user?.email ?? ''}
                          className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-6 py-4 text-white/30 font-mono text-sm cursor-not-allowed"
                        />
                      </div>
                      <button
                        onClick={saveIdentity}
                        disabled={savingProfile || !profile || username.trim() === profile?.username}
                        className="bg-gold text-black px-12 py-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        {savingProfile ? 'Updating...' : saved ? 'Saved ✓' : 'Save Identity'}
                      </button>
                    </div>
                  </section>

                  <section className="liquid-glass p-10 rounded-3xl">
                     <h3 className="font-h2 text-xl text-white mb-8 uppercase tracking-widest">Security & Account</h3>
                     <div className="space-y-4">
                        <button className="w-full p-6 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between group hover:border-gold/30 transition-all">
                           <div className="flex items-center gap-6">
                              <span className="material-symbols-outlined text-gold">lock_reset</span>
                              <div className="text-left">
                                 <h4 className="text-white font-bold uppercase tracking-widest text-xs">Update Cipher Key</h4>
                                 <p className="text-white/30 text-[10px] mt-1 uppercase tracking-tighter">Change your password</p>
                              </div>
                           </div>
                           <span className="material-symbols-outlined text-white/20 group-hover:text-white transition-all">chevron_right</span>
                        </button>

                        <button className="w-full p-6 bg-red-500/5 rounded-2xl border border-red-500/10 flex items-center justify-between group hover:bg-red-500/10 hover:border-red-500/30 transition-all mt-8">
                           <div className="flex items-center gap-6">
                              <span className="material-symbols-outlined text-red-500">delete_forever</span>
                              <div className="text-left">
                                 <h4 className="text-red-500 font-bold uppercase tracking-widest text-xs">Purge Guardian</h4>
                                 <p className="text-red-500/40 text-[10px] mt-1 uppercase tracking-tighter">Permanently delete account</p>
                              </div>
                           </div>
                           <span className="material-symbols-outlined text-red-500/20 group-hover:text-red-500 transition-all">chevron_right</span>
                        </button>
                     </div>
                  </section>
               </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
