import { FormEvent, useState } from 'react';
import { Layout } from '../components/Layout';
import { useProfile } from '../lib/profile';

type TestResult = {
  ok: boolean;
  filter: { blocked: boolean; reason: string; confidence: number; layer: string };
  donation: { id: number; donator_name: string; amount: number; message: string };
};

const PRESETS = {
  clean: [
    { donator: 'Athena', amount: 50000, message: 'Keep up the good work!' },
    { donator: 'Bima', amount: 25000, message: 'Makasih bang, streamnya seru banget malam ini.' },
    { donator: 'Citra', amount: 75000, message: 'Semangat terus ya, jangan lupa istirahat.' },
    { donator: 'Dimas', amount: 15000, message: 'Request lagu boleh gak? Sukses selalu!' },
    { donator: 'Elara', amount: 100000, message: 'Kontennya makin rapi, proud of you.' },
    { donator: 'Raka', amount: 30000, message: 'Halo kak, cuma mau support sedikit.' },
    { donator: 'Naya', amount: 45000, message: 'Mantap pembahasannya, sangat membantu.' },
    { donator: 'Orion', amount: 20000, message: 'Good vibes terus, terima kasih sudah nemenin.' },
  ],
  judol: [
    { donator: 'Spammer_99', amount: 5000, message: 'join alexis17 gacor maxwin now' },
    { donator: 'cuanHunter', amount: 10000, message: 'main di gw pasti mantapp dan cuann' },
    { donator: 'RTP_Live', amount: 7777, message: 'rtp live slot hari ini bocoran pola gacor' },
    { donator: 'BonusNew', amount: 12000, message: 'bonus new member 100% depo kecil auto maxwin' },
    { donator: 's1otMantul', amount: 8888, message: 's1ot g4c0r modal 10rb wd jutaan' },
    { donator: 'AdminWin', amount: 25000, message: 'link alternatif anti rungkad, daftar sekarang' },
    { donator: 'ScatterPro', amount: 50000, message: 'scatter hitam muncul terus, jam gacor malam ini' },
    { donator: 'M4xW1n', amount: 9000, message: 'm4xw1n gampang banget bro, langsung wd cepat' },
  ],
  spam: [
    { donator: 'BotX', amount: 1000, message: 'WA: 081234567890 link: https://bit.ly/abc' },
    { donator: 'PromoBlast', amount: 1000, message: 'klik sekarang hadiah terbatas http://short.ly/freegift' },
    { donator: 'LoanFast', amount: 2000, message: 'pinjaman cepat tanpa bi checking cair 5 menit' },
    { donator: 'AkunBaru', amount: 1500, message: 'follow akun ini sekarang dan dapat bonus spesial' },
    { donator: 'MassDM', amount: 3000, message: 'chat admin 0812-9999-8888 promo cuma hari ini' },
    { donator: 'LinkDrop', amount: 2500, message: 'cek link: https://tinyurl.com/promo-live jangan sampai telat' },
    { donator: 'CopyPaste', amount: 1000, message: 'GRATIS GRATIS GRATIS klaim sekarang sebelum hangus' },
    { donator: 'Unknown', amount: 500, message: 'open jasa murah fast respon wa me now' },
  ],
};

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function TestLab() {
  const { profile } = useProfile();
  const [donator, setDonator] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);

  function applyPreset(key: keyof typeof PRESETS) {
    const p = pickRandom(PRESETS[key]);
    setDonator(p.donator);
    setAmount(p.amount);
    setMessage(p.message);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setError(null);
    setResult(null);
    setSubmitting(true);
    const t0 = performance.now();
    try {
      const res = await fetch(`/api/test/donation/${profile.webhook_token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donator: donator || 'TestDonor',
          amount: typeof amount === 'number' ? amount : 10000,
          message,
        }),
      });
      const text = await res.text();
      let data: TestResult | { error: string };
      try {
        data = JSON.parse(text);
      } catch {
        setError(
          `Server returned non-JSON (HTTP ${res.status}). Check Vercel function logs and env vars (SUPABASE_SECRET_KEY).`,
        );
        console.error('[TestLab] non-JSON response:', text.slice(0, 500));
        return;
      }
      if (!res.ok || 'error' in data) {
        setError('error' in data ? data.error : `HTTP ${res.status}`);
        return;
      }
      setResult(data);
      setElapsed(Math.round(performance.now() - t0));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const verdict = result?.filter.blocked ? 'BLOCKED' : result ? 'PASSED' : 'NOT TESTED';
  const verdictColor = result?.filter.blocked ? 'error' : result ? 'tertiary' : 'white/40';

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-12 py-12">
        <header className="mb-12 blurFadeUp">
           <h1 className="font-h1 text-h1 text-on-surface mb-2 tracking-tight">Test Lab</h1>
           <p className="text-on-surface-variant font-body opacity-70">Stress-test the system's judgment with synthetic donation packets.</p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 items-start">
           <section className="liquid-glass p-8 rounded-2xl relative overflow-hidden blurFadeUp" style={{animationDelay: '0.1s'}}>
              <div className="absolute top-0 right-0 w-32 h-32 greek-meander opacity-20 -mr-12 -mt-12 transform rotate-45"></div>
              <h2 className="font-h2 text-xl text-on-surface mb-8">Donation Payload</h2>

              <form className="space-y-6" onSubmit={handleSubmit}>
                 <div className="space-y-2">
                    <label className="font-label text-white/50 uppercase tracking-widest text-[10px]">Sender Name</label>
                    <input
                      type="text"
                      value={donator}
                      onChange={(e) => setDonator(e.target.value)}
                      placeholder="e.g. Athena"
                      className="w-full bg-[#111111] border border-[#222222] rounded-xl px-4 py-3 focus:outline-none focus:border-gold/40 focus:ring-0 text-on-surface placeholder:text-white/20 transition-all font-body"
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="font-label text-white/50 uppercase tracking-widest text-[10px]">Amount (IDR)</label>
                    <input
                      type="number"
                      min={0}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="50000"
                      className="w-full bg-[#111111] border border-[#222222] rounded-xl px-4 py-3 focus:outline-none focus:border-gold/40 focus:ring-0 text-on-surface placeholder:text-white/20 transition-all font-body"
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="font-label text-white/50 uppercase tracking-widest text-[10px]">Donation Message</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type a message here..."
                      rows={4}
                      className="w-full bg-[#111111] border border-[#222222] rounded-xl px-4 py-3 focus:outline-none focus:border-gold/40 focus:ring-0 text-on-surface placeholder:text-white/20 transition-all font-body resize-none"
                    ></textarea>
                 </div>

                 <div className="space-y-3">
                    <label className="font-label text-white/50 uppercase tracking-widest text-[10px]">Preset Scenario</label>
                    <div className="flex flex-wrap gap-3">
                       <button type="button" onClick={() => applyPreset('clean')} className="px-4 py-2 rounded-full border border-primary/20 bg-primary/10 text-primary font-label text-xs transition-all hover:bg-primary/20">Clean Donation</button>
                       <button type="button" onClick={() => applyPreset('judol')} className="px-4 py-2 rounded-full border border-error/20 bg-error/10 text-error font-label text-xs transition-all hover:bg-error/20">Gambling Donation</button>
                       <button type="button" onClick={() => applyPreset('spam')} className="px-4 py-2 rounded-full border border-white/5 bg-white/5 text-white/40 font-label text-xs transition-all hover:text-white">Spam Pattern</button>
                    </div>
                 </div>

                 {error && (
                    <div className="bg-error/10 border border-error/30 rounded-lg px-4 py-3">
                       <p className="text-error text-xs font-label">{error}</p>
                    </div>
                 )}

                 <button
                   type="submit"
                   disabled={submitting || !profile}
                   className="w-full bg-gold text-[#0A0A0A] font-label font-bold py-4 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(201,168,76,0.2)] uppercase tracking-widest text-sm mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    {submitting ? 'Sending...' : 'Send Test Donation'}
                 </button>
              </form>
           </section>

           <section className="space-y-6 blurFadeUp" style={{animationDelay: '0.2s'}}>
              <div className="liquid-glass rounded-2xl p-8 relative overflow-hidden">
                 <div className="absolute -bottom-8 -left-8 w-48 h-48 greek-meander opacity-10"></div>

                 <div className="flex justify-between items-start mb-12 relative z-10">
                    <div>
                       <p className="font-label text-white/40 uppercase tracking-widest text-[10px] mb-1">Status Verdict</p>
                       <h3 className="font-h2 text-2xl text-on-surface">Oracle Logic</h3>
                    </div>
                    <div className={`px-6 py-3 bg-${verdictColor}/10 border border-${verdictColor}/20 rounded-2xl flex flex-col items-center`}>
                       <span className={`material-symbols-outlined text-${verdictColor} mb-1`}>
                          {result?.filter.blocked ? 'block' : result ? 'verified' : 'help'}
                       </span>
                       <span className={`font-display text-2xl font-black text-${verdictColor} tracking-tighter`}>
                          {verdict}
                       </span>
                    </div>
                 </div>

                 <div className="space-y-4 relative z-10">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                             <span className="material-symbols-outlined text-lg">policy</span>
                          </div>
                          <span className="font-label text-sm text-white/80">Filter Layer</span>
                       </div>
                       <span className="font-label text-xs uppercase tracking-widest text-gold">
                          {result?.filter.layer ?? '-'}
                       </span>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                             <span className="material-symbols-outlined text-lg">psychology</span>
                          </div>
                          <span className="font-label text-sm text-white/80">Reason</span>
                       </div>
                       <span className="font-label text-xs text-white/60 truncate max-w-[200px] text-right">
                          {result?.filter.reason ?? '-'}
                       </span>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="liquid-glass p-6 rounded-2xl">
                    <p className="font-label text-white/30 uppercase tracking-widest text-[9px] mb-2">Confidence Score</p>
                    <div className="flex items-end gap-2">
                       <span className="font-h2 text-3xl text-gold font-bold">
                          {result ? `${(result.filter.confidence * 100).toFixed(1)}%` : '-'}
                       </span>
                    </div>
                 </div>

                 <div className="liquid-glass p-6 rounded-2xl">
                    <p className="font-label text-white/30 uppercase tracking-widest text-[9px] mb-2">Process Time</p>
                    <div className="flex items-end gap-2">
                       <span className="font-h2 text-3xl text-on-surface font-bold">
                          {elapsed !== null ? `${elapsed}ms` : '-'}
                       </span>
                    </div>
                 </div>
              </div>

              {result && (
                <div className={`liquid-glass p-6 rounded-2xl border-l-4 border-${verdictColor}`}>
                   <p className={`font-label text-${verdictColor} uppercase tracking-widest text-[9px] mb-2 font-bold`}>Sentinel Insight</p>
                   <p className="text-white/60 font-body text-sm leading-relaxed">
                      {result.filter.reason}
                   </p>
                </div>
              )}
           </section>
        </div>

      </div>

      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-[-1] overflow-hidden">
         <div className="absolute top-[10%] left-[5%] w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px]"></div>
         <div className="absolute bottom-[10%] right-[5%] w-[500px] h-[500px] bg-gold/5 rounded-full blur-[150px]"></div>
      </div>
    </Layout>
  );
}
