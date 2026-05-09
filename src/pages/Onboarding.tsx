import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProfile } from '../lib/profile';
import { saweriaWebhookUrl } from '../lib/urls';

export function Onboarding() {
  const { profile, loading } = useProfile();
  const [copied, setCopied] = useState(false);

  const webhookUrl = profile ? saweriaWebhookUrl(profile.webhook_token) : '';

  async function copy() {
    if (!webhookUrl) return;
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <main className="min-h-screen bg-background-color text-on-surface font-body selection:bg-tertiary selection:text-on-tertiary flex flex-col items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 greek-meander opacity-20 pointer-events-none translate-x-24 -translate-y-24"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 greek-meander opacity-20 pointer-events-none -translate-x-24 translate-y-24"></div>

      <div className="w-full max-w-4xl blurFadeUp z-10">
        <header className="text-center mb-12">
          <div className="inline-block mb-4 p-3 liquid-glass rounded-full">
            <span className="material-symbols-outlined text-gold text-4xl fill-icon">shield</span>
          </div>
          <h1 className="font-h1 text-h1 text-on-surface mb-2 tracking-tight">Configure Your Sentinel</h1>
          <p className="font-body text-body text-on-surface-variant">Step into the sanctum. Let's secure your stream.</p>
        </header>

        <div className="flex justify-between items-center mb-16 px-12 relative max-w-2xl mx-auto">
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-outline-variant -translate-y-1/2 z-0"></div>
          
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gold text-[#0A0A0A] flex items-center justify-center font-bold shadow-[0_0_15px_rgba(201,168,76,0.5)]">1</div>
            <span className="font-label text-[10px] uppercase text-gold tracking-wider">Webhook Saweria</span>
          </div>
          
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface text-on-surface-variant flex items-center justify-center font-bold border border-outline-variant">2</div>
            <span className="font-label text-[10px] uppercase text-on-surface-variant tracking-wider">Overlay OBS</span>
          </div>
          
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface text-on-surface-variant flex items-center justify-center font-bold border border-outline-variant">3</div>
            <span className="font-label text-[10px] uppercase text-on-surface-variant tracking-wider">Test</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
           <div className="md:col-span-7 flex flex-col gap-6">
              <div className="liquid-glass rounded-xl p-8 border border-white/10">
                 <h2 className="font-h2 text-h2 text-gold mb-4">Integration Hub</h2>
                 <p className="font-body text-on-surface-variant mb-8 text-sm leading-relaxed">Copy the unique sentinel URL below and paste it into your Saweria Webhook settings to start filtering malicious intents.</p>
                 
                 <div className="space-y-4">
                    <label className="font-label text-xs text-on-surface-variant uppercase tracking-widest block">Sentinel Endpoint URL</label>
                    <div className="flex gap-2">
                       <div className="flex-grow font-mono bg-[#111111] border border-outline-variant rounded-lg p-4 text-gold text-sm overflow-x-auto whitespace-nowrap">
                         {loading ? 'Loading...' : webhookUrl || '-'}
                       </div>
                       <button
                          onClick={copy}
                          disabled={!webhookUrl}
                          className="liquid-glass px-4 rounded-lg text-gold hover:bg-gold/10 transition-colors flex items-center justify-center disabled:opacity-40"
                          title="Copy to clipboard"
                       >
                         <span className="material-symbols-outlined">{copied ? 'check' : 'content_copy'}</span>
                       </button>
                    </div>
                    <p className="text-[10px] text-on-surface-variant/60 italic">
                       Paste this URL into Saweria → Integrations → Webhook.
                    </p>
                 </div>

                 <div className="mt-12">
                    <Link to="/dashboard" className="w-full bg-gold text-[#0A0A0A] font-bold py-4 px-8 rounded-lg flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(201,168,76,0.2)]">
                       I've installed it
                       <span className="material-symbols-outlined font-bold">arrow_forward</span>
                    </Link>
                 </div>
              </div>
           </div>
           
           <div className="md:col-span-5 flex flex-col gap-8">
              <div className="liquid-glass rounded-xl p-6 border border-white/10 flex flex-col items-center text-center">
                 <div className="w-full aspect-video rounded-lg bg-[#111111] mb-6 overflow-hidden border border-outline-variant relative">
                    <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCT9oYrj9_RM4gbpbZKKcaX7XiY13th400Ex7O55JX59KvY2k2DiWHO8uwF606mng_yw0rVasJnvj7-bfekFJJYptD5vDbWOKih_J9G1SfXJ_A_ZGwA0J6Uzv9J9FsQUF37fCQP_rv9XQmGl9DIgJqMNw0YCJiOxz2hkV3VQEYbE1URzCyFda4Tzoequlu1RunuLB4zZKruF33iQ4Ma36_iGNVzU2bLMD1qIA3k4_zMuSwZfAmkoJPNZf0VieSJvPL9oHI4P_kYc6U" className="w-full h-full object-cover opacity-40 grayscale" alt="Server room" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] to-transparent"></div>
                    <div className="absolute bottom-4 left-4 right-4 flex flex-col items-start text-left">
                       <span className="font-label text-[10px] text-gold bg-gold/10 px-2 py-1 rounded border border-gold/20 mb-2 font-bold tracking-widest">LIVE PREVIEW</span>
                       <div className="h-2 w-3/4 bg-white/10 rounded-full mb-2"></div>
                       <div className="h-2 w-1/2 bg-white/10 rounded-full"></div>
                    </div>
                 </div>
                 <h3 className="font-label text-on-surface mb-2 tracking-wider">Sentinel Activation</h3>
                 <p className="text-sm text-on-surface-variant leading-relaxed">The Quiet Guardian will analyze incoming metadata instantly. Valid contributions flow through; malicious patterns are silenced.</p>
              </div>
              
              <div className="liquid-glass rounded-xl p-6 border-l-4 border-gold">
                 <div className="flex items-start gap-4">
                    <span className="material-symbols-outlined text-gold mt-1">lightbulb</span>
                    <div>
                       <p className="font-label text-gold mb-1 tracking-wider">Aegis Protection</p>
                       <p className="text-xs text-on-surface-variant leading-relaxed">Ensure you haven't shared your endpoint URL publicly. Each sentinel is unique to your identity.</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
      
      <footer className="fixed bottom-8 w-full flex justify-center pointer-events-none opacity-30 z-0">
          <div className="flex items-center gap-4 text-gold">
              <div className="h-[1px] w-12 bg-gold"></div>
              <span className="font-label text-[10px] tracking-[0.4em] uppercase">Phylaxify Oracle Architecture</span>
              <div className="h-[1px] w-12 bg-gold"></div>
          </div>
      </footer>
    </main>
  );
}
