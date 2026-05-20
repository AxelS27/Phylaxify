// Judol (gambling spam) filter — TS port of old_phylaxify/filters/judolFilter.js
//
// Pipeline:
//   Layer 0: whitelist short-circuit
//   Layer 1: per-user custom blocklist
//   Layer 2a: hardcoded keywords (HIGH + CONTEXT)
//   Layer 2b: regex patterns
//   Layer 3: ML classifier (local SVM on Vercel, optional HF Space for DL)
import { predictLocalSvm } from './localSvm.js';

export type FilterLayer =
  | 'none'
  | 'whitelist'
  | 'custom_blocklist'
  | 'keyword'
  | 'regex'
  | 'ml'
  | 'ml_fallback';

export type FilterResult = {
  blocked: boolean;
  reason: string;
  confidence: number;
  layer: FilterLayer;
};

// ────────────── Layer 1: Normalization ──────────────

const LEET_MAP: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '9': 'g',
  '@': 'a', '$': 's', '!': 'i', '+': 't',
};

// Cross-script look-alikes used to spoof Latin (Cyrillic/Greek/small-caps).
// NFKD does NOT fold these — they're separate scripts with no compat decomp.
const HOMOGLYPH_MAP: Record<string, string> = {
  // Cyrillic lowercase
  а: 'a', е: 'e', о: 'o', р: 'p', с: 'c', у: 'y', х: 'x',
  і: 'i', ї: 'i', ј: 'j', ѕ: 's', ԁ: 'd', ɡ: 'g', һ: 'h', ь: 'b', ν: 'v',
  // Greek lowercase
  α: 'a', β: 'b', γ: 'y', ε: 'e', ι: 'i', κ: 'k',
  ο: 'o', ρ: 'p', τ: 't', υ: 'u', χ: 'x',
  // Latin small-caps & dotless variants
  ɢ: 'g', ʟ: 'l', ɴ: 'n', ʀ: 'r', ʏ: 'y', ʙ: 'b', ɪ: 'i', ı: 'i',
};

function foldHomoglyphs(s: string): string {
  let out = '';
  for (const ch of s) out += HOMOGLYPH_MAP[ch] ?? ch;
  return out;
}

function applyLeet(s: string): string {
  return s.replace(/./g, (c) => LEET_MAP[c] ?? c);
}

/**
 * Aggressive de-obfuscation view. Use this against user blocklist words to
 * survive the typical evasion bag: stylized unicode (𝐠𝐚𝐜𝐨𝐫), homoglyphs
 * (gасor with Cyrillic а/с), leet (g4c0r), separator injection (g-a-c-o-r),
 * and char-stretching (gaaaaccooorr). Steps:
 *   1. lowercase
 *   2. NFKD compatibility decompose, strip combining marks (zalgo + accents)
 *   3. fold cross-script homoglyphs to ASCII
 *   4. leet-fold so digits/symbols-as-letters become letters
 *   5. strip every non-alnum (no space replacement → glues spaced-out runs)
 *   6. collapse 2+ same-char runs to 1 (more aggressive than the {3,} dedup
 *      used in the keyword-layer variants)
 */
export function aggressiveView(text: string): string {
  let s = text.toLowerCase();
  s = s.normalize('NFKD').replace(/\p{M}/gu, '');
  s = foldHomoglyphs(s);
  s = applyLeet(s);
  s = s.replace(/[^a-z0-9]/g, '');
  s = s.replace(/(.)\1+/g, '$1');
  return s;
}

type Variants = {
  original: string;
  normalized: string;
  noSpaces: string;
  noSeparators: string;
  deduped: string;
  aggressive: string;
};

export function normalizeText(text: string): Variants {
  let normalized = text.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '');
  normalized = foldHomoglyphs(normalized);
  normalized = applyLeet(normalized);
  normalized = normalized.replace(/\b(\w)\s+(?=\w\b)/g, (_m, c) => c);
  const noSpaces = normalized.replace(/\s+/g, '');
  const noSeparators = normalized.replace(/[.\-_*~|/\\]/g, '');
  const deduped = noSeparators.replace(/(.)\1{2,}/g, '$1');
  const aggressive = aggressiveView(text);
  return { original: text, normalized, noSpaces, noSeparators, deduped, aggressive };
}

// ────────────── Layer 2: Keywords + Patterns ──────────────

const JUDOL_KEYWORDS_HIGH = [
  'gacor', 'maxwin', 'scatter', 'jackpot',
  'togel', 'judol', 'judi online', 'judi slot',
  'poker online', 'baccarat', 'roulette',
  'freebet', 'freechip',
  'rtp live', 'rtp slot', 'bocoran slot',
  'pola slot', 'pola gacor', 'jam gacor',
  'anti rungkad', 'auto maxwin',
  'link alternatif', 'bonus new member',
  'pinjol', 'pinjaman online', 'tanpa bi checking',
];

const JUDOL_KEYWORDS_CONTEXT = [
  'slot', 'casino', 'deposit', 'withdraw', 'turnover',
  'minimal deposit', 'min depo', 'daftar sekarang',
  'cair cepat', 'tanpa jaminan',
];

const JUDOL_PATTERNS: RegExp[] = [
  /s\s*l\s*o\s*t/i,
  /g\s*a\s*c\s*o\s*r/i,
  /m\s*a\s*x\s*w\s*i\s*n/i,
  /\b\w+slot\w*\.com\b/i,
  /\b\w+gacor\w*\.com\b/i,
  /\b\w+(bet|casino|poker)\w*\.\w+\b/i,
  /deposit\s*\d+\s*(rb|ribu|k)/i,
  /bonus\s*\d+\s*%/i,
  /wa\s*:?\s*0\d{9,12}/i,
  /link\s*:\s*https?:\/\//i,
];

const WHITELIST_PHRASES = [
  'bank transfer', 'bank deposit', 'setor tunai',
  'time slot', 'slot waktu', 'slot antrian',
  'withdraw from atm', 'tarik tunai',
];

function checkKeywords(v: Variants):
  | { matched: true; keyword: string; confidence: number }
  | { matched: false } {
  const texts = [v.normalized, v.noSpaces, v.noSeparators, v.deduped, v.aggressive];

  for (const kw of JUDOL_KEYWORDS_HIGH) {
    for (const t of texts) {
      if (t.includes(kw)) return { matched: true, keyword: kw, confidence: 0.95 };
    }
  }

  const ctx: string[] = [];
  for (const kw of JUDOL_KEYWORDS_CONTEXT) {
    for (const t of texts) {
      if (t.includes(kw)) {
        ctx.push(kw);
        break;
      }
    }
  }
  if (ctx.length >= 2) {
    return { matched: true, keyword: ctx.join(' + '), confidence: 0.8 };
  }
  return { matched: false };
}

function checkPatterns(v: Variants):
  | { matched: true; matchedText: string }
  | { matched: false } {
  const texts = [v.original, v.normalized, v.noSpaces];
  for (const p of JUDOL_PATTERNS) {
    for (const t of texts) {
      const m = t.match(p);
      if (m) return { matched: true, matchedText: m[0] };
    }
  }
  return { matched: false };
}

// ────────────── Layer 3: ML ──────────────

const SENSITIVITY_THRESHOLDS: Record<string, number> = {
  loose: 0.85,
  normal: 0.7,
  strict: 0.5,
};

async function checkML(
  message: string,
  tier: 'svm' | 'dl' = 'svm',
  sensitivity: 'loose' | 'normal' | 'strict' = 'normal',
): Promise<FilterResult | null> {
  const threshold = SENSITIVITY_THRESHOLDS[sensitivity] ?? parseFloat(process.env.JUDOL_ML_CONFIDENCE_THRESHOLD ?? '0.7');

  if (tier === 'svm') {
    try {
      const result = predictLocalSvm(message);
      if (result.label === 'JUDOL' && result.confidence >= threshold) {
        return {
          blocked: true,
          reason: `ML SVM local: SVM Level 3 (${result.confidence.toFixed(2)})`,
          confidence: result.confidence,
          layer: 'ml',
        };
      }
      return {
        blocked: false,
        reason: 'ml svm local: clean',
        confidence: result.confidence,
        layer: 'ml',
      };
    } catch (err) {
      const msg = (err as Error).message;
      console.warn(`[filter] Local SVM skipped — ${msg}`);
      return { blocked: false, reason: `local svm unavailable: ${msg}`, confidence: 0, layer: 'ml_fallback' };
    }
  }

  const apiUrl = process.env.JUDOL_DL_API_URL ?? process.env.JUDOL_ML_API_URL;
  if (!apiUrl) return null;

  const timeoutMs = parseInt(process.env.JUDOL_ML_TIMEOUT_MS ?? '2000', 10);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${apiUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`ML API HTTP ${res.status}`);

    const { label, confidence, matched_patterns } = (await res.json()) as {
      label?: string;
      confidence?: number;
      matched_patterns?: string[];
    };

    if (label === 'JUDOL' && typeof confidence === 'number' && confidence >= threshold) {
      const summary =
        matched_patterns && matched_patterns.length > 0
          ? matched_patterns.slice(0, 3).join(', ')
          : `ML ${tier.toUpperCase()}`;
      return {
        blocked: true,
        reason: `ML ${tier.toUpperCase()}: ${summary} (${confidence.toFixed(2)})`,
        confidence,
        layer: 'ml',
      };
    }
    return {
      blocked: false,
      reason: `ml ${tier}: clean`,
      confidence: typeof confidence === 'number' ? confidence : 0,
      layer: 'ml',
    };
  } catch (err) {
    const name = (err as Error).name;
    const msg = (err as Error).message;
    const reason = name === 'AbortError' ? `ml timeout after ${timeoutMs}ms` : `ml unavailable: ${msg}`;
    console.warn(`[filter] Layer 3 skipped — ${reason}`);
    return { blocked: false, reason, confidence: 0, layer: 'ml_fallback' };
  } finally {
    clearTimeout(timer);
  }
}

// ────────────── Public API ──────────────

export async function filterMessage(
  message: string,
  customBlocklist: string[] = [],
  customWhitelist: string[] = [],
  enableML = true,
  modelTier: 'svm' | 'dl' = 'svm',
  sensitivity: 'loose' | 'normal' | 'strict' = 'normal',
): Promise<FilterResult> {
  if (!message || message.trim() === '') {
    return { blocked: false, reason: 'empty message', confidence: 1, layer: 'none' };
  }

  const v = normalizeText(message);
  const allWhitelist = [...WHITELIST_PHRASES, ...customWhitelist];

  for (const phrase of allWhitelist) {
    if (v.normalized.includes(phrase.toLowerCase())) {
      return { blocked: false, reason: `whitelisted: "${phrase}"`, confidence: 1, layer: 'whitelist' };
    }
  }

  // Check user blocklist against ALL variants. The aggressive view catches
  // the typical judol obfuscation tricks: "g@@ c-c-c00 oorrr r" -> "gacor",
  // "𝐠𝐚𝐜𝐨𝐫" -> "gacor", "gасor" (Cyrillic) -> "gacor". Needles get the
  // same transform so a user typing "gacor 88" matches "gacor88" too.
  for (const w of customBlocklist) {
    const wLower = w.toLowerCase();
    const wAggr = aggressiveView(w);
    const matched =
      v.normalized.includes(wLower) ||
      v.noSpaces.includes(wLower) ||
      v.noSeparators.includes(wLower) ||
      v.deduped.includes(wLower) ||
      (wAggr.length > 0 && v.aggressive.includes(wAggr));
    if (matched) {
      return {
        blocked: true,
        reason: `Custom blocklist match: "${w}"`,
        confidence: 1,
        layer: 'custom_blocklist',
      };
    }
  }

  const kw = checkKeywords(v);
  if (kw.matched) {
    return {
      blocked: true,
      reason: `Keyword match: "${kw.keyword}"`,
      confidence: kw.confidence,
      layer: 'keyword',
    };
  }

  const pat = checkPatterns(v);
  if (pat.matched) {
    return {
      blocked: true,
      reason: `Pattern match: ${pat.matchedText}`,
      confidence: 0.85,
      layer: 'regex',
    };
  }

  if (enableML) {
    const ml = await checkML(message, modelTier, sensitivity);
    if (ml) return ml;
  }

  return { blocked: false, reason: 'clean', confidence: 0.9, layer: 'none' };
}

/**
 * High-level function to filter an entire donation (name + message).
 */
export async function filterDonation(
  name: string,
  message: string,
  customBlocklist: string[] = [],
  customWhitelist: string[] = [],
  enableML = true,
  modelTier: 'svm' | 'dl' = 'svm',
  sensitivity: 'loose' | 'normal' | 'strict' = 'normal',
  filterName = true,
  filterMessage_ = true,
): Promise<FilterResult> {
  if (filterName) {
    const nameResult = await filterMessage(name, customBlocklist, customWhitelist, enableML, modelTier, sensitivity);
    if (nameResult.blocked) return { ...nameResult, reason: `Name: ${nameResult.reason}` };
  }
  if (filterMessage_) {
    return filterMessage(message, customBlocklist, customWhitelist, enableML, modelTier, sensitivity);
  }
  return { blocked: false, reason: 'clean', confidence: 0.9, layer: 'none' };
}
