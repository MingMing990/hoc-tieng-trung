/**
 * Pinyin Tone Conversion Engine
 * Converts numbered pinyin (e.g. ma1, ni3 hao3, xue2xi2, lv4) into accented unicode pinyin.
 * Rules:
 * 1. 'a' and 'e' always take the tone mark.
 * 2. 'ou' takes tone on 'o'.
 * 3. In other diphthongs/triphthongs, the last vowel takes the tone (e.g. ui -> uǐ, iu -> iū).
 * 4. 'v' or 'u:' is converted to 'ü'.
 * 5. 5 or no number indicates neutral tone (khinh thanh).
 */

const PINYIN_TONE_TABLE = {
  a: ['ā', 'á', 'ǎ', 'à'],
  e: ['ē', 'é', 'ě', 'è'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
  v: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
  A: ['Ā', 'Á', 'Ǎ', 'À'],
  E: ['Ē', 'É', 'Ě', 'È'],
  I: ['Ī', 'Í', 'Ǐ', 'Ì'],
  O: ['Ō', 'Ó', 'Ǒ', 'Ò'],
  U: ['Ū', 'Ú', 'Ǔ', 'Ù'],
  V: ['Ǖ', 'Ǘ', 'Ǚ', 'Ǜ'],
  Ü: ['Ǖ', 'Ǘ', 'Ǚ', 'Ǜ']
};

/**
 * Converts a single syllable with a tone number (1-5)
 * @param {string} syllable - e.g. "ma1", "xue2", "lv4", "hao3"
 * @returns {string} - e.g. "mā", "xué", "lǜ", "hǎo"
 */
function convertPinyinSyllable(syllable) {
  const match = syllable.match(/^([a-zA-ZüÜvV:]+)([1-5])$/);
  if (!match) return syllable;

  let word = match[1];
  const tone = parseInt(match[2], 10);

  // Normalize 'u:' or 'v' to 'ü'
  word = word.replace(/u:/gi, 'ü').replace(/v/g, 'ü').replace(/V/g, 'Ü');

  // Tone 5 is neutral (khinh thanh)
  if (tone === 5) {
    return word;
  }

  const toneIndex = tone - 1; // 0 to 3
  let targetPos = -1;
  let targetChar = '';

  // Rule 1: 'a' or 'e' always gets the tone
  const aeMatch = word.match(/[aeAE]/);
  if (aeMatch) {
    targetPos = aeMatch.index;
    targetChar = aeMatch[0];
  } else if (/ou|OU|Ou|oU/.test(word)) {
    // Rule 2: 'ou' -> 'o' gets the tone
    const ouMatch = word.match(/[oO](?=[uU])/);
    targetPos = ouMatch.index;
    targetChar = ouMatch[0];
  } else {
    // Rule 3: Otherwise the last vowel gets the tone
    const vowels = [...word.matchAll(/[aeiouvüAEIOUVÜ]/g)];
    if (vowels.length > 0) {
      const lastVowelMatch = vowels[vowels.length - 1];
      targetPos = lastVowelMatch.index;
      targetChar = lastVowelMatch[0];
    }
  }

  if (targetPos !== -1 && PINYIN_TONE_TABLE[targetChar]) {
    const accentedChar = PINYIN_TONE_TABLE[targetChar][toneIndex];
    return word.slice(0, targetPos) + accentedChar + word.slice(targetPos + 1);
  }

  return word;
}

/**
 * Converts any text containing numbered pinyin
 * Works with full phrases like "ni3 hao3", "xue2 xi2", "wo3 shi4 lao3 shi1"
 * @param {string} text
 * @returns {string}
 */
function convertPinyinText(text) {
  if (!text) return '';

  // Replace syllables ending in 1-5
  // Support both letter+number and u:+number
  return text.replace(/([a-zA-ZüÜvV:]+)([1-5])/g, (match) => {
    return convertPinyinSyllable(match);
  });
}

// Quick test in browser / node if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { convertPinyinSyllable, convertPinyinText, PINYIN_TONE_TABLE };
}
