import male from '@/assets/avatars/male.png';
import female from '@/assets/avatars/female.png';
import other from '@/assets/avatars/other.png';

export type Gender = 'male' | 'female' | 'other' | null | undefined;

const FEMALE_KEYS = new Set([
  'f',
  'female',
  'woman',
  'w',
  'kadın',
  'kadin',
  'k',
  '2',
  'fem',
  'female ',
  ' kadın',
  'fema le',
  'bay an',
  'bayan',
  'feminin',
  'feminine',
  'femail',
  'famele',
  'famele ',
  'femal',
  'famele',
  'femalee',
  'FEMALE'.toLowerCase(),
]);

const MALE_KEYS = new Set([
  'm',
  'male',
  'man',
  'erkek',
  'e',
  '1',
  'masculine',
  'bay',
  'erk',
  'MALE'.toLowerCase(),
]);

const OTHER_KEYS = new Set<string>([
  'o',
  'other',
  'x',
  'nb',
  'nonbinary',
  'non-binary',
  'neutral',
  'nötr',
  'notr',
  'unknown',
  'u',
]);

export function normalizeGender(input: unknown): Gender {
  if (input == null) return null;
  const s = String(input).trim().toLowerCase();
  if (!s) return null;
  if (FEMALE_KEYS.has(s)) return 'female';
  if (MALE_KEYS.has(s)) return 'male';

  if (s === 'female') return 'female';
  if (s === 'male') return 'male';
  if (OTHER_KEYS.has(s) || s === 'other') return 'other';
  return 'other';
}

export function getAvatarByGender(input: unknown): string {
  switch (normalizeGender(input)) {
    case 'female':
      return female;
    case 'other':
      return other;
    case 'male':
    default:
      return male;
  }
}
