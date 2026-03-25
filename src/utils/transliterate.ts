/**
 * Tamil to Tanglish (Roman/English) transliteration utility.
 * Converts Tamil Unicode script to approximate English phonetic spelling,
 * enabling Tanglish search (e.g. "parupu" matches "பருப்பு").
 */

// Tamil vowels (உயிர் எழுத்துக்கள்) - standalone
const VOWELS: Record<string, string> = {
  'அ': 'a', 'ஆ': 'aa', 'இ': 'i', 'ஈ': 'ee',
  'உ': 'u', 'ஊ': 'oo', 'எ': 'e', 'ஏ': 'ae',
  'ஐ': 'ai', 'ஒ': 'o', 'ஓ': 'oa', 'ஔ': 'au',
};

// Tamil consonants (மெய் எழுத்துக்கள்)
const CONSONANTS: Record<string, string> = {
  'க': 'k', 'ங': 'ng', 'ச': 's', 'ஞ': 'nj',
  'ட': 'd', 'ண': 'n', 'த': 'th', 'ந': 'n',
  'ப': 'p', 'ம': 'm', 'ய': 'y', 'ர': 'r',
  'ல': 'l', 'வ': 'v', 'ழ': 'zh', 'ள': 'l',
  'ற': 'r', 'ன': 'n', 'ஜ': 'j', 'ஷ': 'sh',
  'ஸ': 's', 'ஹ': 'h', 'க்ஷ': 'ksh', 'ஶ': 'sh',
};

// Vowel signs (உயிர்மெய் குறியீடுகள்) — suffixed to consonant
const VOWEL_SIGNS: Record<string, string> = {
  'ா': 'aa', 'ி': 'i', 'ீ': 'ee', 'ு': 'u',
  'ூ': 'oo', 'ெ': 'e', 'ே': 'ae', 'ை': 'ai',
  'ொ': 'o', 'ோ': 'oa', 'ௌ': 'au',
  '்': '',   // pulli (virama) — suppresses inherent vowel
};

/**
 * Convert a Tamil string to its approximate Tanglish/Roman phonetic form.
 * e.g. "பருப்பு" → "parruppu", "தக்காளி" → "thakkaali"
 */
export function tamilToTanglish(tamil: string): string {
  if (!tamil || typeof tamil !== 'string') return '';

  let result = '';
  const chars = Array.from(tamil.trim()); // Split by Unicode codepoint

  let i = 0;
  while (i < chars.length) {
    const ch = chars[i];

    // ── Standalone vowels ──────────────────────────────────
    if (VOWELS[ch] !== undefined) {
      result += VOWELS[ch];
      i++;
      continue;
    }

    // ── Consonant ──────────────────────────────────────────
    if (CONSONANTS[ch] !== undefined) {
      const consonantRoman = CONSONANTS[ch];
      const next = chars[i + 1];

      if (next !== undefined && VOWEL_SIGNS[next] !== undefined) {
        // Consonant + vowel sign
        result += consonantRoman + VOWEL_SIGNS[next];
        i += 2;
      } else {
        // Consonant with inherent 'a' vowel
        result += consonantRoman + 'a';
        i++;
      }
      continue;
    }

    // ── Vowel sign without preceding consonant (rare) ──────
    if (VOWEL_SIGNS[ch] !== undefined) {
      result += VOWEL_SIGNS[ch];
      i++;
      continue;
    }

    // ── Non-Tamil characters (digits, spaces, punctuation) ─
    result += ch;
    i++;
  }

  return result.toLowerCase();
}

/**
 * Check if a search term (Tanglish/Roman) loosely matches a Tamil string.
 * Handles minor spelling variations like "parupu" vs "parruppu".
 */
export function tanglishMatchesTamil(searchTerm: string, tamilText: string): boolean {
  if (!searchTerm || !tamilText) return false;
  const romanized = tamilToTanglish(tamilText);
  const term = searchTerm.toLowerCase().trim();

  // Direct inclusion
  if (romanized.includes(term)) return true;

  // Fuzzy: ignore doubled consonants (e.g. "parupu" matches "parruppu")
  const simplified = romanized.replace(/(.)\1+/g, '$1'); // collapse doubles
  const termSimplified = term.replace(/(.)\1+/g, '$1');
  return simplified.includes(termSimplified);
}
