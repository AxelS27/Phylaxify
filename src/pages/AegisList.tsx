import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useProfile } from '../lib/profile';
import { getBlocklistLimit, getEffectivePlan } from '../lib/plan';
import {
  BLOCKLIST_TEMPLATES,
  CUSTOM_CATEGORY,
  type BlocklistTemplate,
} from '../data/blocklistTemplates';

type BlockRow = { id: number; word: string; category: string };

export function AegisList() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [words, setWords] = useState<BlockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const effectivePlan = getEffectivePlan(profile?.plan ?? 'free', profile?.plan_expires_at ?? null);
  const limit = getBlocklistLimit(profile?.plan ?? 'free', profile?.plan_expires_at ?? null);
  const isAtLimit = words.length >= limit;

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('blocklist')
      .select('id, word, category')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setWords(data ?? []);
    setError(null);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const allWordsLower = useMemo(
    () => new Set(words.map((w) => w.word)),
    [words],
  );

  async function addWord(raw: string, category: string) {
    if (!user) return;
    const word = raw.trim().toLowerCase();
    if (!word) return;
    if (allWordsLower.has(word)) {
      setError(`"${word}" is already in your blocklist (check other sections).`);
      return;
    }
    if (words.length >= limit) {
      setError(`You've reached the ${limit}-word limit for the ${effectivePlan} plan.`);
      return;
    }
    setError(null);
    const { data: inserted, error } = await supabase
      .from('blocklist')
      .insert({ user_id: user.id, word, category })
      .select('id, word, category')
      .single();
    if (error) {
      setError(error.message);
      return;
    }
    if (inserted) setWords((prev) => [inserted as BlockRow, ...prev]);
  }

  async function removeWord(id: number) {
    const { error } = await supabase.from('blocklist').delete().eq('id', id);
    if (error) {
      setError(error.message);
      return;
    }
    setWords((prev) => prev.filter((w) => w.id !== id));
  }

  return (
    <Layout>
      <div className="absolute top-0 right-0 w-96 h-96 bg-gold/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

      <div className="max-w-4xl mx-auto p-12">
        <header className="flex items-center justify-between mb-4 blurFadeUp">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-h1 text-gold uppercase tracking-tighter">Custom Blocklist</h1>
            <p className="text-white/50 font-body max-w-md">
              Define the semantic boundaries of your digital sanctum. Organized by category, each section has its own keywords and brands.
            </p>
          </div>
          <div className="w-32 h-32 opacity-20">
            <svg className="fill-gold" viewBox="0 0 100 100">
              <path d="M50 5 L90 25 L90 75 L50 95 L10 75 L10 25 Z" fill="none" stroke="currentColor" strokeWidth="1"></path>
              <circle cx="50" cy="50" fill="none" r="30" stroke="currentColor" strokeWidth="0.5"></circle>
              <path d="M50 20 L50 80 M20 50 L80 50" stroke="currentColor" strokeWidth="0.5"></path>
            </svg>
          </div>
        </header>

        {/* Word limit indicator */}
        <div className="liquid-glass rounded-xl p-4 mb-8 flex items-center gap-6 blurFadeUp" style={{ animationDelay: '0.05s' }}>
          <div className="flex-1">
            <div className="flex justify-between items-center mb-2">
              <span className="font-label text-[10px] uppercase tracking-widest text-white/40">Words Used</span>
              <span className="font-label text-[10px] uppercase tracking-widest">
                <span className={isAtLimit ? 'text-error font-bold' : 'text-gold'}>{words.length}</span>
                <span className="text-white/30"> / {limit}</span>
              </span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isAtLimit ? 'bg-error' : words.length / limit > 0.8 ? 'bg-gold' : 'bg-tertiary'
                }`}
                style={{ width: `${Math.min((words.length / limit) * 100, 100)}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
              effectivePlan === 'premium'
                ? 'bg-gold/10 text-gold border-gold/30'
                : 'bg-white/5 text-white/40 border-white/10'
            }`}>
              {effectivePlan}
            </span>
            {effectivePlan === 'free' && (
              <Link
                to="/upgrade"
                className="px-3 py-1 rounded-full bg-gold text-[#0A0A0A] text-[10px] font-bold uppercase tracking-widest hover:brightness-110 transition-all"
              >
                Upgrade
              </Link>
            )}
          </div>
        </div>

        {isAtLimit && effectivePlan === 'free' && (
          <div className="mb-8 px-6 py-4 rounded-xl border border-gold/30 bg-gold/5 flex items-center justify-between blurFadeUp">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-gold">lock</span>
              <div>
                <p className="text-sm font-bold text-gold">Free plan limit reached ({limit} words)</p>
                <p className="text-xs text-white/50 mt-0.5">Upgrade to Premium to add up to 500 words.</p>
              </div>
            </div>
            <Link
              to="/upgrade"
              className="px-5 py-2 rounded-lg bg-gold text-[#0A0A0A] font-label text-xs uppercase tracking-widest hover:brightness-110 transition-all font-bold shrink-0"
            >
              Upgrade Now
            </Link>
          </div>
        )}

        <div className="w-full h-8 greek-meander mb-12 opacity-30 blurFadeUp" style={{animationDelay: '0.1s'}}></div>

        {error && (
          <div className="mb-8 px-6 py-3 rounded-lg border border-error/30 bg-error/5 blurFadeUp">
            <p className="text-error text-sm font-label">{error}</p>
          </div>
        )}

        {loading ? (
          <p className="text-white/30 text-sm">Loading blocklist...</p>
        ) : (
          <div className="flex flex-col gap-12">
            {BLOCKLIST_TEMPLATES.map((tpl, idx) => (
              <CategorySection
                key={tpl.category}
                template={tpl}
                words={words}
                allWordsLower={allWordsLower}
                onAdd={addWord}
                onRemove={removeWord}
                animationDelay={0.2 + idx * 0.1}
                isAtLimit={isAtLimit}
              />
            ))}
            <CustomSection
              words={words}
              onAdd={addWord}
              onRemove={removeWord}
              animationDelay={0.2 + BLOCKLIST_TEMPLATES.length * 0.1}
              isAtLimit={isAtLimit}
            />
          </div>
        )}
      </div>

      <div className="absolute bottom-0 right-0 p-12 pointer-events-none opacity-20">
        <svg className="text-gold" height="200" viewBox="0 0 100 100" width="200">
          <path d="M10,10 L90,10 L90,90 L10,90 Z" fill="none" stroke="currentColor" strokeWidth="0.5"></path>
          <path d="M0,0 L100,100 M100,0 L0,100" stroke="currentColor" strokeWidth="0.1"></path>
          <circle cx="50" cy="50" fill="none" r="40" stroke="currentColor" strokeDasharray="2,2" strokeWidth="0.2"></circle>
        </svg>
      </div>
    </Layout>
  );
}

type SectionProps = {
  template: BlocklistTemplate;
  words: BlockRow[];
  allWordsLower: Set<string>;
  onAdd: (raw: string, category: string) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
  animationDelay: number;
  isAtLimit: boolean;
};

function CategorySection({ template, words, allWordsLower, onAdd, onRemove, animationDelay, isAtLimit }: SectionProps) {
  const [input, setInput] = useState('');
  const active = words.filter((w) => w.category === template.category);
  const suggestions = template.terms.filter((t) => !allWordsLower.has(t));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const w = input;
    setInput('');
    await onAdd(w, template.category);
  }

  return (
    <section
      className="liquid-glass p-8 rounded-xl border border-white/5 blurFadeUp"
      style={{ animationDelay: `${animationDelay}s` }}
    >
      <div className="flex items-start gap-4 mb-6">
        <span className="material-symbols-outlined text-gold/70 text-3xl mt-0.5">
          {template.icon}
        </span>
        <div className="flex-grow">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h2 className="text-white/90 font-display text-2xl">{template.title}</h2>
            <span className="text-gold/60 font-label text-xs uppercase tracking-widest">
              {active.length} blocked
            </span>
          </div>
          <p className="text-white/40 text-sm font-body mt-1">{template.description}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3 mb-6">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isAtLimit ? 'Limit reached — upgrade to add more' : template.inputPlaceholder}
          disabled={isAtLimit}
          className="flex-grow bg-[#111111] border-[#222222] border rounded-lg px-5 py-3 text-white text-sm focus:outline-none focus:border-gold/30 focus:ring-1 focus:ring-gold/20 transition-all font-body disabled:opacity-40 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={isAtLimit}
          className="bg-gold/10 hover:bg-gold/20 border border-gold/30 px-6 py-3 rounded-lg text-gold font-label text-xs uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </form>

      {/* Scrollable so it scales past hundreds of entries */}
      {active.length > 0 && (
        <div className="mb-6 border-t border-white/5 pt-4 max-h-60 overflow-y-auto pr-2 -mr-2">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-0.5">
            {active.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between py-1 px-2 rounded hover:bg-white/5 group transition-colors"
              >
                <span className="text-white/70 font-body text-xs truncate">{row.word}</span>
                <button
                  onClick={() => onRemove(row.id)}
                  className="text-white/20 group-hover:text-error opacity-0 group-hover:opacity-100 transition-all leading-none ml-2 shrink-0"
                  aria-label={`Remove ${row.word}`}
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {suggestions.length > 0 && (
        <div>
          <h4 className="font-label text-xs uppercase tracking-widest text-gold/60 mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">auto_awesome</span>
            Suggestions ({suggestions.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((term) => (
              <button
                key={term}
                onClick={() => !isAtLimit && onAdd(term, template.category)}
                disabled={isAtLimit}
                className="group bg-gold/5 hover:bg-gold/10 border border-gold/20 px-4 py-2 rounded-full transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="text-gold font-bold leading-none group-hover:scale-125 transition-transform">+</span>
                <span className="text-white/70 font-body text-xs">{term}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {active.length === 0 && suggestions.length === 0 && (
        <p className="text-white/30 text-sm italic">All suggestions imported. Add more via the input above.</p>
      )}
    </section>
  );
}

type CustomSectionProps = {
  words: BlockRow[];
  onAdd: (raw: string, category: string) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
  animationDelay: number;
  isAtLimit: boolean;
};

function CustomSection({ words, onAdd, onRemove, animationDelay, isAtLimit }: CustomSectionProps) {
  const [input, setInput] = useState('');
  const known = new Set(BLOCKLIST_TEMPLATES.map((t) => t.category));
  const active = words.filter((w) => !known.has(w.category));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const w = input;
    setInput('');
    await onAdd(w, CUSTOM_CATEGORY);
  }

  return (
    <section
      className="liquid-glass p-8 rounded-xl border border-white/5 blurFadeUp"
      style={{ animationDelay: `${animationDelay}s` }}
    >
      <div className="flex items-start gap-4 mb-6">
        <span className="material-symbols-outlined text-gold/70 text-3xl mt-0.5">tune</span>
        <div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <h2 className="text-white/90 font-display text-2xl">Custom</h2>
            <span className="text-gold/60 font-label text-xs uppercase tracking-widest">
              {active.length} blocked
            </span>
          </div>
          <p className="text-white/40 text-sm font-body mt-1">
            Free-form entries that don't fit any category above.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3 mb-6">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isAtLimit ? 'Limit reached — upgrade to add more' : 'Add a custom word or phrase...'}
          disabled={isAtLimit}
          className="flex-grow bg-[#111111] border-[#222222] border rounded-lg px-5 py-3 text-white text-sm focus:outline-none focus:border-gold/30 focus:ring-1 focus:ring-gold/20 transition-all font-body disabled:opacity-40 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={isAtLimit}
          className="bg-gold/10 hover:bg-gold/20 border border-gold/30 px-6 py-3 rounded-lg text-gold font-label text-xs uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </form>

      {active.length > 0 ? (
        <div className="border-t border-white/5 pt-4 max-h-60 overflow-y-auto pr-2 -mr-2">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-0.5">
            {active.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between py-1 px-2 rounded hover:bg-white/5 group transition-colors"
              >
                <span className="text-white/70 font-body text-xs truncate">{row.word}</span>
                <button
                  onClick={() => onRemove(row.id)}
                  className="text-white/20 group-hover:text-error opacity-0 group-hover:opacity-100 transition-all leading-none ml-2 shrink-0"
                  aria-label={`Remove ${row.word}`}
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-white/30 text-sm italic">No custom entries yet.</p>
      )}
    </section>
  );
}
