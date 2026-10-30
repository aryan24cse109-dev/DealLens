function estimateTokens(value) {
  return Math.ceil(JSON.stringify(value).length / 4);
}

export function splitIntoBatches(items, batchSize) {
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new TypeError('batchSize must be a positive integer.');
  }

  const batches = [];
  for (let index = 0; index < items.length; index += batchSize) {
    batches.push(items.slice(index, index + batchSize));
  }
  return batches;
}

export function splitChangesByTokenBudget(
  changes,
  { maxChanges, maxPromptTokens, overheadTokens = 500 },
) {
  if (!Number.isInteger(maxChanges) || maxChanges < 1) {
    throw new TypeError('maxChanges must be a positive integer.');
  }
  if (!Number.isInteger(maxPromptTokens) || maxPromptTokens < 1) {
    throw new TypeError('maxPromptTokens must be a positive integer.');
  }

  const batches = [];
  let batch = [];
  let batchTokens = overheadTokens;

  for (const change of changes) {
    const changeTokens = estimateTokens(change);
    if (batch.length && (
      batch.length >= maxChanges
      || batchTokens + changeTokens > maxPromptTokens
    )) {
      batches.push(batch);
      batch = [];
      batchTokens = overheadTokens;
    }

    if (changeTokens + overheadTokens > maxPromptTokens) {
      throw new Error(
        `Change ${change.id} exceeds the configured AI prompt token budget.`,
      );
    }

    batch.push(change);
    batchTokens += changeTokens;
  }

  if (batch.length) batches.push(batch);
  return batches;
}
