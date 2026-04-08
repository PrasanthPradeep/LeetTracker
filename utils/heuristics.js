/**
 * Heuristic Estimation Engine
 * When no real data exists for a problem, estimate likely companies
 * based on difficulty, tags, and popularity patterns
 */

const HEURISTIC_RULES = {
  // Company -> [difficulty patterns, topic affinities]
  'Amazon': {
    difficultyWeight: { 'Easy': 0.8, 'Medium': 0.9, 'Hard': 0.6 },
    topicAffinity: ['array', 'string', 'hash-table', 'dynamic-programming', 'tree', 'bfs', 'dfs', 'stack', 'queue', 'sorting', 'design', 'greedy', 'linked-list'],
    baseFrequency: 0.7,
    popularityBoost: 0.15
  },
  'Google': {
    difficultyWeight: { 'Easy': 0.3, 'Medium': 0.8, 'Hard': 0.95 },
    topicAffinity: ['dynamic-programming', 'graph', 'bfs', 'dfs', 'binary-search', 'tree', 'trie', 'segment-tree', 'string', 'math', 'geometry', 'recursion', 'backtracking', 'union-find'],
    baseFrequency: 0.65,
    popularityBoost: 0.1
  },
  'Meta': {
    difficultyWeight: { 'Easy': 0.4, 'Medium': 0.9, 'Hard': 0.7 },
    topicAffinity: ['array', 'string', 'binary-search', 'two-pointers', 'sliding-window', 'graph', 'bfs', 'dfs', 'tree', 'dynamic-programming', 'hash-table', 'stack', 'recursion'],
    baseFrequency: 0.65,
    popularityBoost: 0.12
  },
  'Microsoft': {
    difficultyWeight: { 'Easy': 0.7, 'Medium': 0.85, 'Hard': 0.5 },
    topicAffinity: ['array', 'string', 'hash-table', 'tree', 'dynamic-programming', 'linked-list', 'matrix', 'sorting', 'stack', 'design', 'math'],
    baseFrequency: 0.6,
    popularityBoost: 0.1
  },
  'Apple': {
    difficultyWeight: { 'Easy': 0.5, 'Medium': 0.8, 'Hard': 0.6 },
    topicAffinity: ['array', 'string', 'tree', 'dynamic-programming', 'sorting', 'linked-list', 'design', 'hash-table', 'math'],
    baseFrequency: 0.45,
    popularityBoost: 0.1
  },
  'Bloomberg': {
    difficultyWeight: { 'Easy': 0.6, 'Medium': 0.85, 'Hard': 0.5 },
    topicAffinity: ['stack', 'queue', 'design', 'hash-table', 'string', 'array', 'tree', 'linked-list', 'sorting', 'heap'],
    baseFrequency: 0.5,
    popularityBoost: 0.08
  },
  'Uber': {
    difficultyWeight: { 'Easy': 0.3, 'Medium': 0.8, 'Hard': 0.7 },
    topicAffinity: ['graph', 'bfs', 'dfs', 'dynamic-programming', 'design', 'array', 'hash-table', 'math', 'geometry', 'heap'],
    baseFrequency: 0.4,
    popularityBoost: 0.08
  },
  'Adobe': {
    difficultyWeight: { 'Easy': 0.6, 'Medium': 0.8, 'Hard': 0.4 },
    topicAffinity: ['array', 'string', 'matrix', 'dynamic-programming', 'backtracking', 'tree', 'hash-table', 'sorting'],
    baseFrequency: 0.4,
    popularityBoost: 0.08
  },
  'Goldman Sachs': {
    difficultyWeight: { 'Easy': 0.4, 'Medium': 0.8, 'Hard': 0.6 },
    topicAffinity: ['dynamic-programming', 'math', 'array', 'string', 'hash-table', 'greedy', 'sorting', 'heap'],
    baseFrequency: 0.35,
    popularityBoost: 0.05
  },
  'TCS': {
    difficultyWeight: { 'Easy': 0.9, 'Medium': 0.5, 'Hard': 0.1 },
    topicAffinity: ['array', 'string', 'math', 'sorting', 'hash-table', 'linked-list'],
    baseFrequency: 0.5,
    popularityBoost: 0.15
  },
  'Infosys': {
    difficultyWeight: { 'Easy': 0.9, 'Medium': 0.5, 'Hard': 0.1 },
    topicAffinity: ['array', 'string', 'math', 'sorting', 'hash-table', 'linked-list', 'pattern'],
    baseFrequency: 0.5,
    popularityBoost: 0.15
  },
  'LinkedIn': {
    difficultyWeight: { 'Easy': 0.5, 'Medium': 0.85, 'Hard': 0.55 },
    topicAffinity: ['dynamic-programming', 'graph', 'design', 'hash-table', 'tree', 'array', 'string', 'bfs', 'dfs'],
    baseFrequency: 0.4,
    popularityBoost: 0.08
  },
  'Netflix': {
    difficultyWeight: { 'Easy': 0.3, 'Medium': 0.7, 'Hard': 0.8 },
    topicAffinity: ['design', 'dynamic-programming', 'graph', 'hash-table', 'string', 'array'],
    baseFrequency: 0.3,
    popularityBoost: 0.05
  },
  'Stripe': {
    difficultyWeight: { 'Easy': 0.3, 'Medium': 0.8, 'Hard': 0.7 },
    topicAffinity: ['design', 'string', 'array', 'hash-table', 'simulation', 'math'],
    baseFrequency: 0.3,
    popularityBoost: 0.05
  }
};

function estimateCompanies(problemInfo) {
  const {
    difficulty = 'Medium',
    tags = [],
    acceptanceRate = 50,
    totalSubmissions = 0
  } = problemInfo;

  const normalizedTags = tags.map(t =>
    (typeof t === 'string' ? t : (t.slug || t.name || '')).toLowerCase().replace(/\s+/g, '-')
  );

  const isPopular = totalSubmissions > 500000 || acceptanceRate > 60;
  const results = [];

  for (const [company, rules] of Object.entries(HEURISTIC_RULES)) {
    let score = rules.baseFrequency;

    // Apply difficulty weight
    const diffWeight = rules.difficultyWeight[difficulty] || 0.5;
    score *= diffWeight;

    // Apply topic affinity
    let topicMatch = 0;
    for (const tag of normalizedTags) {
      if (rules.topicAffinity.includes(tag)) {
        topicMatch++;
      }
    }
    if (normalizedTags.length > 0) {
      const topicBoost = (topicMatch / normalizedTags.length) * 0.3;
      score += topicBoost;
    }

    // Popularity boost
    if (isPopular) {
      score += rules.popularityBoost;
    }

    // Clamp to [0, 1]
    score = Math.min(1, Math.max(0, score));

    if (score >= 0.25) {
      let freqLabel;
      if (score >= 0.65) freqLabel = 'High';
      else if (score >= 0.4) freqLabel = 'Medium';
      else freqLabel = 'Low';

      results.push({
        company,
        frequency: freqLabel,
        timesAsked: Math.round(score * 30),
        periods: { alltime: true },
        lastSeen: 'Estimated',
        confidence: Math.round(score * 40) / 100, // max ~0.4 for heuristics
        source: 'heuristic'
      });
    }
  }

  // Sort by confidence descending
  results.sort((a, b) => b.confidence - a.confidence);
  return results.slice(0, 8); // Return top 8 estimates
}

// Make available globally
if (typeof window !== 'undefined') {
  window.LCHeuristics = { estimateCompanies, HEURISTIC_RULES };
}
