// src/pair-agent/correlation.js — Calculate correlation between two price series
function calculateCorrelation(pricesA, pricesB) {
  if (!Array.isArray(pricesA) || !Array.isArray(pricesB)) {
    throw new Error('Both inputs must be arrays');
  }

  if (pricesA.length !== pricesB.length || pricesA.length === 0) {
    throw new Error('Arrays must have same non-zero length');
  }

  const n = pricesA.length;

  // Calculate means
  const meanA = pricesA.reduce((sum, val) => sum + val, 0) / n;
  const meanB = pricesB.reduce((sum, val) => sum + val, 0) / n;

  // Calculate correlation coefficient
  let numerator = 0;
  let denomA = 0;
  let denomB = 0;

  for (let i = 0; i < n; i++) {
    const diffA = pricesA[i] - meanA;
    const diffB = pricesB[i] - meanB;
    numerator += diffA * diffB;
    denomA += diffA * diffA;
    denomB += diffB * diffB;
  }

  const denominator = Math.sqrt(denomA * denomB);

  if (denominator === 0) {
    return 0; // No correlation if one series is constant
  }

  return numerator / denominator;
}

module.exports = { calculateCorrelation };
