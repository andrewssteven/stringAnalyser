const crypto = require("crypto");

function analyzeString(value) {
  const length = [...value].length; // counts codepoints
  const lowered = value.toLowerCase();
  const is_palindrome = lowered === [...lowered].reverse().join("");
  const charFreq = {};
  for (const ch of value) {
    charFreq[ch] = (charFreq[ch] || 0) + 1;
  }
  const unique_characters = Object.keys(charFreq).length;
  const word_count = value.trim() === "" ? 0 : value.trim().split(/\s+/).length;
  const sha256_hash = crypto.createHash("sha256").update(value).digest("hex");
  return {
    length,
    is_palindrome,
    unique_characters,
    word_count,
    sha256_hash,
    character_frequency_map: charFreq,
  };
}

module.exports = { analyzeString };
