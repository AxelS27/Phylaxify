"""Robust text normalization for Indonesian gambling-promo (judol) detection.

Used at BOTH training and inference. Two views:
  - normalize_text: light, mostly-lossless. NFKC compatibility-fold (stylized
    math/circled letters become ASCII), strip combining marks (zalgo),
    drop invisible / zero-width chars, collapse whitespace. Preserves casing
    and punctuation so brand-decorating symbols are still visible.
  - aggressive_view: heavy de-obfuscation. Lowercase, clamp char-stretching
    (digit runs 3+ -> 1, symbol runs 2+ -> 1, letter runs 3+ -> 2), fold
    leetspeak EARLY (so @,0,3,etc become letters before stripping), strip
    remaining non-alnum, then glue spaced-out runs back together via two
    passes (single-char runs and short-token runs).

The model receives BOTH via make_input as "{normalized} | {aggressive}" so it
sees the original (with stylization NFKC handles) AND a fully de-obfuscated
form. This dual-view is what gives the classifier its robustness against
inputs like "g@@@ c0000 ooo r___Rr!r".
"""

import re
import unicodedata

try:
    from confusable_homoglyphs import confusables as _confusables
except ImportError:  # library is optional; manual map covers the common cases
    _confusables = None

# Cache: any non-ASCII character we've already resolved (or ruled out) goes
# here so the per-char Unicode confusable lookup runs at most once per char
# across the whole dataset. Map values: ASCII replacement string (possibly "").
_CONFUSABLE_CACHE: dict[str, str] = {}

_LEET_MAP = str.maketrans({
    "@": "a", "4": "a",
    "8": "b",
    "(": "c",
    "3": "e",
    "!": "i", "1": "i", "|": "i",
    "0": "o",
    "$": "s", "5": "s",
    "7": "t",
    "2": "z",
})

# Cross-script & extended-Latin homoglyphs that look identical to ASCII
# letters but tokenize differently. NFKD doesn't fold these (different
# scripts), so we apply this map explicitly. Covers Cyrillic, Greek,
# small-caps Latin, and dotless i variants — the standard evasion set.
_HOMOGLYPH_MAP = str.maketrans({
    # Cyrillic lowercase look-alikes
    "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "у": "y", "х": "x",
    "і": "i", "ї": "i", "ј": "j", "ѕ": "s", "ԁ": "d", "ɡ": "g", "һ": "h",
    "ь": "b", "ν": "v",
    # Cyrillic uppercase
    "А": "A", "В": "B", "С": "C", "Е": "E", "Н": "H", "І": "I", "Ј": "J",
    "К": "K", "М": "M", "О": "O", "Р": "P", "Ѕ": "S", "Т": "T", "Х": "X",
    "У": "Y",
    # Greek lowercase
    "α": "a", "β": "b", "γ": "y", "ε": "e", "ι": "i", "κ": "k",
    "ο": "o", "ρ": "p", "τ": "t", "υ": "u", "χ": "x", "ѵ": "v",
    # Greek uppercase
    "Α": "A", "Β": "B", "Ε": "E", "Ζ": "Z", "Η": "H", "Ι": "I", "Κ": "K",
    "Μ": "M", "Ν": "N", "Ο": "O", "Ρ": "P", "Τ": "T", "Υ": "Y", "Χ": "X",
    # Latin small caps & dotless variants
    "ɢ": "g", "ʟ": "l", "ɴ": "n", "ʀ": "r", "ʏ": "y", "ʙ": "b", "ɪ": "i",
    "ı": "i", "İ": "I", "ɫ": "l", "ɭ": "l",
    # Canadian Aboriginal Syllabics used as Latin look-alikes (judol obfuscation
    # observed in dataset, e.g. "ᗩᗷGᗯIᑎ" for "ABGWIN", "ᑭᑌᒪᗩᑌᗯIᑎ" for "PULAUWIN").
    # NFKD does NOT fold these — they're a different script with no compat decomp.
    "ᗩ": "A", "ᗷ": "B", "ᑕ": "C", "ᗪ": "D", "ᕮ": "E", "ᖴ": "F",
    "ᕼ": "H", "ᒍ": "J", "K": "K", "ᒪ": "L", "ᗰ": "M", "ᑎ": "N",
    "ᗝ": "O", "ᑭ": "P", "ᑫ": "Q", "ᖇ": "R", "ᔕ": "S", "ᗴ": "E",
    "ᑌ": "U", "ᐯ": "V", "ᗯ": "W", "ᕽ": "X", "ᗌ": "Y", "ᘔ": "Z",
})

# Programmatic ranges: emoji-style letter blocks used as Latin spoofs. NFKD only
# folds some (e.g. Squared has <square> compat decomp, Circled has <circle>) but
# leaves "Negative Squared", "Negative Circled", and Regional Indicators as
# standalone glyphs. We map them all explicitly so behavior is deterministic
# regardless of which Unicode-tagged decompositions the runtime applies.
def _add_letter_range(start_codepoint: int, ascii_start: str) -> None:
    base = ord(ascii_start)
    for i in range(26):
        _HOMOGLYPH_MAP[start_codepoint + i] = base + i

# Squared Latin Capital A-Z (🄰-🅉) at U+1F130
_add_letter_range(0x1F130, "A")
# Negative Squared Latin Capital A-Z (🅰-🆉) at U+1F170
_add_letter_range(0x1F170, "A")
# Negative Circled Latin Capital A-Z (🅐-🅩) at U+1F150
_add_letter_range(0x1F150, "A")
# Regional Indicator Symbol Letter A-Z (🇦-🇿) at U+1F1E6 — used standalone for
# spoofing (e.g. "🇦🇱🇪🇽🇮🇸") even though paired they form country flags.
_add_letter_range(0x1F1E6, "A")
# Circled Latin Capital A-Z (Ⓐ-Ⓩ) at U+24B6 — NFKD folds these but be explicit
_add_letter_range(0x24B6, "A")
# Circled Latin Small a-z (ⓐ-ⓩ) at U+24D0
_add_letter_range(0x24D0, "a")
# Parenthesized Latin Small a-z (⒜-⒵) at U+249C — NFKD folds with parens, but
# we want them as bare letters
for i in range(26):
    _HOMOGLYPH_MAP[0x249C + i] = ord("a") + i

# Common dot-obfuscation in URLs: "domain[dot]com", "goko (dot) ng", etc.
# Requires alphanumeric on both sides so standalone "dot" isn't replaced.
_DOT_OBFUSC_RE = re.compile(
    r"(\w)\s*[\[\(\{<]?\s*(?:dot|titik)\s*[\]\)\}>]?\s*(\w)",
    re.IGNORECASE,
)
_BRACKETED_DOT_RE = re.compile(r"(\w)\s*[\[\(\{<]\s*\.\s*[\]\)\}>]\s*(\w)")

# Char-stretching clamps. Different thresholds because:
#   - digits in obfuscation are placeholders ("g0000l" -> "gool" -> "gol"),
#     so >=3 same digit collapses to 1.
#   - symbols repeated never carry info ("@@@@" -> "@"), so >=2 -> 1.
#   - letters: 3+ same letter is almost always obfuscation in Indonesian
#     (the natural ceiling is 2: "loose", "boom"; longer runs come from stretch
#     attacks "gaaaaccccoooorrr" or laughs "haaaaa"). Clamp to 1 in aggressive
#     view — even if it over-folds rare words, the dual-view (normalized side
#     keeps the original) means the model still has the unfolded form for
#     context. Catches the worst-case "gaaaaaccccoooorrr" -> "gacor".
_DIGIT_REPEAT_RE = re.compile(r"(\d)\1{2,}")
_SYM_REPEAT_RE = re.compile(r"([^\w\s])\1+")
_LETTER_REPEAT_RE = re.compile(r"([a-z])\1{2,}")

# Indonesian money amounts: <digits><unit> (50jt, 100rb, 2juta, 1miliar). Protect
# these from leet-fold so 5→s, 0→o doesn't mangle "depo50jt" into "deposojt" —
# the deposit/withdraw amount is itself a strong judol signal.
_NUM_UNIT_RE = re.compile(r"\d+(?:jt|rb|juta(?:an)?|ribu(?:an)?|miliar(?:an)?)\b")

_WS_RE = re.compile(r"\s+")
_NON_ALNUM_RE = re.compile(r"[^a-z0-9\s]")

# Pass 1: 3+ single-char alnum tokens separated by spaces ("a l e x i s").
_SPACED_LETTERS_RE = re.compile(r"(?:(?<=^)|(?<=\s))(?:[a-z0-9]\s){2,}[a-z0-9](?=\s|$)")
# Pass 2: 4+ tokens of length 1-3 each ("ga co oo r" -> "gacoor"). Threshold
# 4 to avoid gluing legit short phrases ("ya hp aku" stays apart).
_SHORT_TOKENS_RE = re.compile(
    r"(?:(?<=^)|(?<=\s))(?:[a-z0-9]{1,3}\s){3,}[a-z0-9]{1,3}(?=\s|$)"
)

# Map zero-width / invisible chars to None (delete). Mapping to a space (older
# behavior) lets attackers split a token like "gacor" into "ga cor" by
# injecting U+200B between letters — the gluer thresholds (3+ singles, 4+ short
# tokens) won't catch a 2-token split. Deleting joins the halves directly.
_INVISIBLE = dict.fromkeys(
    [0x200B, 0x200C, 0x200D, 0x2060, 0xFEFF, 0x180E, 0x00AD, 0x034F], None
)


def _confusable_fold(s: str) -> str:
    """Fall back to Unicode UTS#39 confusables data for any non-ASCII char
    not caught by _HOMOGLYPH_MAP. Catches obscure scripts (Cherokee, Coptic,
    Tifinagh, Armenian, etc.) used as Latin look-alikes. No-op if the
    confusable_homoglyphs library is unavailable.
    """
    if _confusables is None or not s:
        return s
    out = []
    for ch in s:
        # Fast path: ASCII or whitespace stays.
        if ord(ch) < 128 or ch.isspace():
            out.append(ch)
            continue
        cached = _CONFUSABLE_CACHE.get(ch)
        if cached is not None:
            out.append(cached)
            continue
        try:
            hits = _confusables.is_confusable(
                ch, greedy=True, preferred_aliases=["LATIN", "COMMON"]
            )
        except Exception:
            hits = False
        if hits and isinstance(hits, list) and hits[0].get("homoglyphs"):
            # The library may return ASCII directly, extended-Latin (ꞓ), or
            # Latin+combining (e.g. "O̵"). NFKD + strip-combining handles the
            # last case; we then only accept if the result is pure ASCII.
            for cand in hits[0]["homoglyphs"]:
                rep = cand.get("c", "")
                rep = unicodedata.normalize("NFKD", rep)
                rep = "".join(c for c in rep if not unicodedata.combining(c))
                if rep and all(ord(c) < 128 for c in rep):
                    _CONFUSABLE_CACHE[ch] = rep
                    out.append(rep)
                    break
            else:
                _CONFUSABLE_CACHE[ch] = ch
                out.append(ch)
            continue
        _CONFUSABLE_CACHE[ch] = ch  # remember "no fold available"
        out.append(ch)
    return "".join(out)


def normalize_text(s: str) -> str:
    if not s:
        return ""
    s = str(s).translate(_INVISIBLE)
    # NFKD (not NFKC): decomposes precomposed accented Latin (e.g. "à" ->
    # "a" + combining grave) so the next step can strip the accent. Still
    # applies compatibility folding (stylized math letters -> ASCII).
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    # Map cross-script homoglyphs back to ASCII (Cyrillic/Greek look-alikes).
    s = s.translate(_HOMOGLYPH_MAP)
    # Final fallback: any non-ASCII letter still standing gets folded via
    # Unicode confusables data (Cherokee, Coptic, Armenian, Tifinagh, ...).
    s = _confusable_fold(s)
    # De-obfuscate URL dot-obfuscation: "goko[dot]ng" -> "goko.ng"
    s = _DOT_OBFUSC_RE.sub(r"\1.\2", s)
    s = _BRACKETED_DOT_RE.sub(r"\1.\2", s)
    s = _WS_RE.sub(" ", s).strip()
    return s


def aggressive_view(s: str) -> str:
    s = normalize_text(s).lower()
    if not s:
        return ""
    # 1. Clamp char-stretching first (preserves leet placeholders as single chars)
    s = _DIGIT_REPEAT_RE.sub(r"\1", s)
    s = _SYM_REPEAT_RE.sub(r"\1", s)
    s = _LETTER_REPEAT_RE.sub(r"\1", s)
    # 2. Leet fold EARLY so @,0,3,etc. become letters BEFORE stripping symbols.
    # Skip num+unit substrings (50jt, 100rb) so deposit-amount semantics survive.
    parts, last = [], 0
    for m in _NUM_UNIT_RE.finditer(s):
        parts.append(s[last:m.start()].translate(_LEET_MAP))
        parts.append(m.group(0))
        last = m.end()
    parts.append(s[last:].translate(_LEET_MAP))
    s = "".join(parts)
    # 3. Re-clamp letters post-leet ("g0l0l" -> "golol" still ok; "boooo" handled earlier)
    s = _LETTER_REPEAT_RE.sub(r"\1", s)
    # 4. Strip whatever non-alnum remains
    s = _NON_ALNUM_RE.sub(" ", s)
    s = _WS_RE.sub(" ", s).strip()
    # 5. Glue: pass 1 handles "a l e x i s 1 7"; pass 2 handles "ga co oo r"
    s = _SPACED_LETTERS_RE.sub(lambda m: m.group(0).replace(" ", ""), s)
    s = _SHORT_TOKENS_RE.sub(lambda m: m.group(0).replace(" ", ""), s)
    # 6. Final letter clamp post-glue ("gacoor" stays; "gacooor" -> "gacoor")
    s = _LETTER_REPEAT_RE.sub(r"\1", s)
    s = _WS_RE.sub(" ", s).strip()
    return s


def make_input(s: str) -> str:
    a = normalize_text(s)
    b = aggressive_view(s)
    if not b or a.lower().strip() == b.strip():
        return a
    return f"{a} | {b}"


if __name__ == "__main__":
    samples = [
        "Makin yakin abis baca review lain tentang ✌✌\U0001D412\U0001D406\U0001D408\U0001D7D6\U0001D7D6.",
        "█\U0001D608\U0001D60C\U0001D60D\U0001D610 bener2 bikin aku jadi sultan",
        "kebanggaan gua nih ⭐ A L E X I S 1 7 ⭐",
        "M4nnn t@@@_@_@_@ ppp!p!p__!_!_!",
        "g4c0r parah link slot baru",
        "g@@@ c0000 ooo r___Rr!r",
        "5l07 G@C0R bosku",
        # Cross-script homoglyphs (Cyrillic/Greek look-alikes)
        "main di аlexis17 dijamin gасor",  # а=Cyrillic U+0430, с=Cyrillic
        "ѕlot gαcor mantul",                # ѕ=Cyrillic, α=Greek
        "ɢacor ʟink ѕlot",                  # small-caps + Cyrillic
        # Accented Latin (precomposed)
        "àléxís 17 mántúl",
        # URL dot-obfuscation
        "daftar di gokong[dot]com",
        "link mala (dot) com bosku",
        # Dotless i / İ
        "ı17 ızının ɢacor",
        # Clean text
        "Mobilnya udah hancur",
        "tahun 2024 ekonomi membaik",
        "naïve approach café au lait",
    ]
    for s in samples:
        print("RAW :", s)
        print("NORM:", normalize_text(s))
        print("AGGR:", aggressive_view(s))
        print("INP :", make_input(s))
        print("-" * 60)
