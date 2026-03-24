
const TAMIL_VOWELS: Record<string, string> = {
  'a': 'அ', 'aa': 'ஆ', 'A': 'ஆ', 'i': 'இ', 'ii': 'ஈ', 'I': 'ஈ',
  'u': 'உ', 'uu': 'ஊ', 'U': 'ஊ', 'e': 'எ', 'ee': 'ஏ', 'E': 'ஏ',
  'ai': 'ஐ', 'o': 'ஒ', 'oo': 'ஓ', 'O': 'ஓ', 'au': 'ஔ'
};

const TAMIL_CONSONANTS: Record<string, string> = {
  'k': 'க', 'g': 'க', 'kh': 'க', 'gh': 'க',
  'ng': 'ங',
  'ch': 'ச', 's': 'ச', 'j': 'ஜ',
  'nj': 'ஞ',
  't': 'ட', 'd': 'ட',
  'N': 'ண',
  'th': 'த', 'dh': 'த',
  'n': 'ந',
  'p': 'ப', 'b': 'ப', 'f': 'ப',
  'm': 'ம',
  'y': 'ய',
  'r': 'ர',
  'l': 'ல',
  'v': 'வ', 'w': 'வ',
  'zh': 'ழ',
  'L': 'ள',
  'R': 'ற',
  'nn': 'ன',
  'sh': 'ஷ', 'S': 'ஸ', 'h': 'ஹ'
};

const TAMIL_VOWEL_SIGNS: Record<string, string> = {
  'a': '', 'aa': 'ா', 'A': 'ா', 'i': 'ி', 'ii': 'ீ', 'I': 'ீ',
  'u': 'ு', 'uu': 'ூ', 'U': 'ூ', 'e': 'ெ', 'ee': 'ே', 'E': 'ே',
  'ai': 'ை', 'o': 'ொ', 'oo': 'ோ', 'O': 'ோ', 'au': 'ௌ'
};

export const transliterateToTamil = (text: string): string => {
  if (!text) return '';
  
  let result = '';
  let i = 0;
  const lower = text.toLowerCase();

  while (i < lower.length) {
    let handled = false;

    // Try 2-char consonants/vowels first (e.g., 'th', 'aa')
    const double = lower.substr(i, 2);
    const triple = lower.substr(i, 3);

    // Consonant clusters like 'th', 'ng'
    if (TAMIL_CONSONANTS[double]) {
      const consonant = TAMIL_CONSONANTS[double];
      const nextDouble = lower.substr(i + 2, 2);
      const nextSingle = lower.substr(i + 2, 1);
      
      if (TAMIL_VOWEL_SIGNS[nextDouble]) {
        result += consonant + TAMIL_VOWEL_SIGNS[nextDouble];
        i += 4;
      } else if (TAMIL_VOWEL_SIGNS[nextSingle]) {
        result += consonant + TAMIL_VOWEL_SIGNS[nextSingle];
        i += 3;
      } else {
        // Pure consonant with pulli
        result += consonant + '்';
        i += 2;
      }
      handled = true;
    } 
    // Single consonants
    else if (TAMIL_CONSONANTS[lower[i]]) {
      const consonant = TAMIL_CONSONANTS[lower[i]];
      const nextDouble = lower.substr(i + 1, 2);
      const nextSingle = lower.substr(i + 1, 1);

      if (TAMIL_VOWEL_SIGNS[nextDouble]) {
        result += consonant + TAMIL_VOWEL_SIGNS[nextDouble];
        i += 3;
      } else if (TAMIL_VOWEL_SIGNS[nextSingle]) {
        result += consonant + TAMIL_VOWEL_SIGNS[nextSingle];
        i += 2;
      } else {
        result += consonant + '்';
        i += 1;
      }
      handled = true;
    }
    // Standalone vowels
    else if (TAMIL_VOWELS[double]) {
      result += TAMIL_VOWELS[double];
      i += 2;
      handled = true;
    } else if (TAMIL_VOWELS[lower[i]]) {
      result += TAMIL_VOWELS[lower[i]];
      i += 1;
      handled = true;
    }

    if (!handled) {
      result += text[i];
      i++;
    }
  }

  return result;
};

export const transliterateTamilToLatin = (text: string) => {
  // Mock transliteration for now (use tamilToTanglish in other file if needed)
  return text;
};
