const words = (value) => String(value || "")
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .match(/[a-z0-9]+/g) || [];

// OCR often drops punctuation and misreads individual letters. Compare rare
// word pairs as well as individual words so a common sentence cannot win just
// because it shares the book's vocabulary.
export function findPageSyncMatch(ocrText, pages) {
  const query = words(ocrText).filter((word) => word.length > 2);
  if (query.length < 8 || !pages?.length) return null;
  const queryWords = new Set(query);
  const queryPairs = new Set(query.slice(1).map((word, i) => `${query[i]} ${word}`));
  const ranked = pages.map((page) => {
    const pageWords = words(page.text).filter((word) => word.length > 2);
    const pageSet = new Set(pageWords);
    const pagePairs = new Set(pageWords.slice(1).map((word, i) => `${pageWords[i]} ${word}`));
    const matchedWords = [...queryWords].filter((word) => pageSet.has(word)).length;
    const matchedPairs = [...queryPairs].filter((pair) => pagePairs.has(pair)).length;
    return {
      ...page,
      score: 0.45 * matchedWords / Math.max(1, queryWords.size)
        + 0.55 * matchedPairs / Math.max(1, queryPairs.size),
      matchedWords,
      matchedPairs,
    };
  }).sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const runnerUp = ranked[1];
  if (!best || best.matchedWords < 7 || best.matchedPairs < 2 || best.score < 0.34) return null;
  if (runnerUp && best.score - runnerUp.score < 0.055) return null;
  return best;
}
