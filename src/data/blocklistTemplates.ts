// Categorized starter packs for the per-user blocklist (table public.blocklist).
// `category` matches the DB column value. The AegisList page renders one
// section per category and stores the user's added words with that category
// tag. Edit freely; nothing is auto-applied to user data.

export type BlocklistTemplate = {
  category: string; // matches public.blocklist.category in Supabase
  title: string;
  description: string;
  icon: string; // Material Symbols name
  inputPlaceholder: string;
  terms: string[];
};

// Special category for free-form entries that don't fit any template.
export const CUSTOM_CATEGORY = 'custom';

export const BLOCKLIST_TEMPLATES: BlocklistTemplate[] = [
  {
    category: 'brand',
    title: 'Gambling Brands',
    description: 'Names of online gambling sites (slot/casino) you want to block.',
    icon: 'casino',
    inputPlaceholder: 'Add a new brand name...',
    terms: [
      'alexis17',
      'alexis',
      'sgi88',
      'manut88',
      'mala',
      'abgwin',
      'pulauwin',
      'pokerbola',
      'agustoto',
      'mandalika77',
      'weton88',
      'pluto88',
      'dora77',
      'dewadora',
      'bonanja',
      'zeus888',
      'zeus88',
      'olympus888',
      'starlight888',
      'gates888',
      'aztec88',
      'sweet888',
      'mahjong88',
      'maxwin88',
      'hoki88',
      'kong88',
      'spaceman88',
      'princess888',
      'bonanza888',
    ],
  },
  {
    category: 'judol_keyword',
    title: 'Gambling Keywords',
    description: 'Slang & promotional phrases common in gambling spam.',
    icon: 'language',
    inputPlaceholder: 'Add a new gambling keyword...',
    terms: [
      'gacor',
      'maxwin',
      'jackpot',
      'freespin',
      'freebet',
      'scatter',
      'rungkad',
      'boncos',
      'anti rungkad',
      'anti zonk',
      'auto wd',
      'auto cuan',
      'auto jp',
      'auto sultan',
      'cuan deras',
      'gampang menang',
      'pasti menang',
      'dijamin menang',
      'mantul jiwa',
      'slot gacor',
      'spin gacor',
      'judi online',
      'judi onlen',
      'judol',
      'min depo',
      'bonus depo',
      'depo pulsa',
      'rtp slot',
      'pola gacor',
    ],
  },
  {
    category: 'pinjol',
    title: 'Illegal Loans',
    description: 'Phrases promoting illegal online loans.',
    icon: 'payments',
    inputPlaceholder: 'Add a new loan keyword...',
    terms: [
      'pinjol',
      'pinjaman ilegal',
      'pinjaman online ilegal',
      'dana cair cepat',
      'cair tanpa bi checking',
      'tanpa jaminan ktp',
    ],
  },
  {
    category: 'scam',
    title: 'Scam & Phishing',
    description: 'Fake prize patterns & suspicious links.',
    icon: 'verified_user',
    inputPlaceholder: 'Add a new scam keyword...',
    terms: [
      'klaim hadiah',
      'hadiah jutaan',
      'klik link',
      'klik bio',
      'swipe up bio',
      'cek bio',
    ],
  },
];
