
import { normalizeText } from './text-normalizer.js';

const MAX_LINES = 1500;
const MAX_COMPARISON_CELLS = 1_000_000;

/**
 * Creates a deterministic line-based diff.
 *
 * Each change has a type: ADDED, REMOVED, or MODIFIED.
 * Matching lines are ignored.
 */
export function compareContractText(originalText, revisedText) {
  const original = normalizeText(originalText).split('\n');
  const revised = normalizeText(revisedText).split('\n');

  if (original.length > MAX_LINES || revised.length > MAX_LINES) {
    throw new Error(
      `Contract exceeds the ${MAX_LINES}-line comparison limit.`,
    );
  }

  if (original.length * revised.length > MAX_COMPARISON_CELLS) {
    throw new Error(
      'Contract is too large for the current comparison algorithm.',
    );
  }

  const rows = original.length + 1;
  const cols = revised.length + 1;

  // Longest Common Subsequence (LCS) table.
  const dp = Array.from(
    { length: rows },
    () => new Uint32Array(cols),
  );

  for (let i = original.length - 1; i >= 0; i -= 1) {
    for (let j = revised.length - 1; j >= 0; j -= 1) {
      if (original[i] === revised[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  // Convert the LCS into an ordered sequence of operations.
  const operations = [];
  let i = 0;
  let j = 0;

  while (i < original.length && j < revised.length) {
    if (original[i] === revised[j]) {
      operations.push({ type: 'EQUAL', text: original[i] });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      operations.push({ type: 'REMOVED', text: original[i] });
      i += 1;
    } else {
      operations.push({ type: 'ADDED', text: revised[j] });
      j += 1;
    }
  }

  while (i < original.length) {
    operations.push({ type: 'REMOVED', text: original[i] });
    i += 1;
  }

  while (j < revised.length) {
    operations.push({ type: 'ADDED', text: revised[j] });
    j += 1;
  }

  // Group adjacent changes. Pair removed/added lines in the same
  // block as MODIFIED, leaving unmatched lines as ADDED/REMOVED.
  const changes = [];
  let originalLine = 0;
  let revisedLine = 0;
  let cursor = 0;

  while (cursor < operations.length) {
    const operation = operations[cursor];

    if (operation.type === 'EQUAL') {
      originalLine += 1;
      revisedLine += 1;
      cursor += 1;
      continue;
    }

    const removed = [];
    const added = [];

    while (
      cursor < operations.length &&
      operations[cursor].type !== 'EQUAL'
    ) {
      const current = operations[cursor];

      if (current.type === 'REMOVED') {
        removed.push({
          text: current.text,
          line: originalLine + 1,
        });
        originalLine += 1;
      } else {
        added.push({
          text: current.text,
          line: revisedLine + 1,
        });
        revisedLine += 1;
      }

      cursor += 1;
    }

    const pairedCount = Math.min(removed.length, added.length);

    for (let index = 0; index < pairedCount; index += 1) {
      changes.push({
        type: 'MODIFIED',
        originalText: removed[index].text,
        revisedText: added[index].text,
        originalLine: removed[index].line,
        revisedLine: added[index].line,
      });
    }

    for (let index = pairedCount; index < removed.length; index += 1) {
      changes.push({
        type: 'REMOVED',
        originalText: removed[index].text,
        originalLine: removed[index].line,
      });
    }

    for (let index = pairedCount; index < added.length; index += 1) {
      changes.push({
        type: 'ADDED',
        revisedText: added[index].text,
        revisedLine: added[index].line,
      });
    }
  }

  return {
    summary: {
      added: changes.filter((change) => change.type === 'ADDED').length,
      removed: changes.filter((change) => change.type === 'REMOVED').length,
      modified: changes.filter((change) => change.type === 'MODIFIED').length,
      total: changes.length,
    },
    changes,
  };
}
