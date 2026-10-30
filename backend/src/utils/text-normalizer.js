
/**
 * Normalizes extracted contract text for comparison.
 *
 * Preserves meaningful wording, numbers, dates, and punctuation.
 * Only standardizes Unicode, line endings, and whitespace.
 */
export function normalizeText(text) {
  if (typeof text !== 'string') {
    throw new TypeError('Text to normalize must be a string.');
  }

  return text
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00A0/g, ' ')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Produces non-empty lines for line-based comparison.
 * The original normalized text is not modified.
 */
export function splitIntoLines(text) {
  return normalizeText(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}
