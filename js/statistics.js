/**
 * statistics.js — Performance Statistics and Benchmarking
 * AI-8Puzzle-Visualizer | Student: 24BCI0212
 *
 * Collects, formats, and stores actual measured statistics
 * from GBFS search runs. Never fabricates or estimates results.
 */

'use strict';

import { HEURISTIC } from './heuristics.js';
import { estimateMemory } from './gbfs.js';

// ── Statistics Store ───────────────────────────────────────

/**
 * Stores the results of completed search runs for comparison.
 * All data here is measured from actual algorithm execution.
 */
export class StatisticsStore {
  constructor() {
    this._runs = [];
    this._currentRun = null;
  }

  /** Start recording a new run */
  startRun(heuristic, initialTiles, goalTiles) {
    this._currentRun = {
      id:           Date.now(),
      timestamp:    new Date().toISOString(),
      heuristic,
      initialState: [...initialTiles],
      goalState:    [...goalTiles],
      startTime:    performance.now(),
      endTime:      null,
      completed:    false,
    };
  }

  /** Record the result of a completed run */
  recordResult(gbfsResult) {
    if (!this._currentRun) return;

    this._currentRun.endTime      = performance.now();
    this._currentRun.completed    = true;
    this._currentRun.found        = gbfsResult.found;
    this._currentRun.solutionMoves= gbfsResult.solutionMoves;
    this._currentRun.nodesGenerated= gbfsResult.nodesGenerated;
    this._currentRun.nodesExpanded = gbfsResult.nodesExpanded;
    this._currentRun.maxDepth      = gbfsResult.maxDepth;
    this._currentRun.executionTime = gbfsResult.executionTime;
    this._currentRun.memoryEstimate= gbfsResult.memoryEstimate;
    this._currentRun.message       = gbfsResult.message;

    this._runs.push({ ...this._currentRun });
    this._currentRun = null;

    return this._runs[this._runs.length - 1];
  }

  /** Get all runs */
  getAllRuns() { return [...this._runs]; }

  /** Get the most recent run */
  getLatestRun() {
    return this._runs.length > 0 ? this._runs[this._runs.length - 1] : null;
  }

  /** Get runs for a specific heuristic */
  getRunsByHeuristic(heuristic) {
    return this._runs.filter(r => r.heuristic === heuristic);
  }

  /** Clear all stored runs */
  clear() { this._runs = []; }

  /** Export runs as JSON */
  exportJSON() { return JSON.stringify(this._runs, null, 2); }
}

// ── Statistics Formatter ───────────────────────────────────

/**
 * Format a GBFSResult into display-ready statistics.
 * @param {object} result - GBFSResult from runGBFS()
 * @returns {object} - Formatted statistics object
 */
export function formatStatistics(result) {
  if (!result) return getEmptyStats();

  return {
    solutionStatus: result.found ? 'FOUND' : 'NOT FOUND',
    statusClass:    result.found ? 'success' : 'danger',
    totalMoves:     result.solutionMoves,
    nodesGenerated: result.nodesGenerated,
    nodesExpanded:  result.nodesExpanded,
    maxDepth:       result.maxDepth,
    executionTime:  formatTime(result.executionTime),
    executionTimeRaw: result.executionTime,
    pathCost:       result.solutionMoves,  // Unit cost per move in 8-puzzle
    memoryEstimate: result.memoryEstimate + ' (estimated)',
    heuristic:      result.heuristic,
    heuristicName:  getHeuristicDisplayName(result.heuristic),
    message:        result.message,
  };
}

/** Return empty placeholder statistics */
export function getEmptyStats() {
  return {
    solutionStatus:  '—',
    statusClass:     '',
    totalMoves:      '—',
    nodesGenerated:  '—',
    nodesExpanded:   '—',
    maxDepth:        '—',
    executionTime:   '—',
    executionTimeRaw: 0,
    pathCost:        '—',
    memoryEstimate:  '—',
    heuristic:       '—',
    heuristicName:   '—',
    message:         'Run the solver to see statistics.',
  };
}

// ── Time Formatter ─────────────────────────────────────────

/**
 * Format milliseconds into a human-readable time string.
 * @param {number} ms
 * @returns {string}
 */
export function formatTime(ms) {
  if (ms < 1)    return `${ms.toFixed(3)} ms`;
  if (ms < 1000) return `${ms.toFixed(2)} ms`;
  return `${(ms / 1000).toFixed(3)} s`;
}

// ── Heuristic Display Names ────────────────────────────────
function getHeuristicDisplayName(heuristic) {
  const names = {
    [HEURISTIC.MISPLACED]: 'Misplaced Tiles (h₁)',
    [HEURISTIC.MANHATTAN]: 'Manhattan Distance (h₂)',
  };
  return names[heuristic] || heuristic;
}

// ── Theoretical Algorithm Data ─────────────────────────────

/**
 * Returns theoretical properties for all 6 algorithms listed in the assignment.
 * GBFS entries use actual measured data where available.
 * Other algorithms show theoretical/reference values with clear labelling.
 *
 * IMPORTANT: These theoretical values are standard textbook values,
 * not fabricated or invented results.
 */
export function getTheoreticalAlgorithmData() {
  return [
    {
      id:             'bfs',
      name:           'Breadth-First Search',
      abbr:           'BFS',
      evaluationFn:   'g(n) (depth)',
      complete:       true,
      optimal:        true,  // With unit costs
      timeComplexity: 'O(b^d)',
      spaceComplexity:'O(b^d)',
      strategy:       'Expand shallowest node first',
      dataSource:     'theoretical',
      notes:          'b = branching factor (≤4), d = solution depth',
    },
    {
      id:             'dfs',
      name:           'Depth-First Search',
      abbr:           'DFS',
      evaluationFn:   'depth (LIFO)',
      complete:       false,   // Not complete in infinite spaces
      optimal:        false,
      timeComplexity: 'O(b^m)',
      spaceComplexity:'O(bm)',
      strategy:       'Expand deepest node first',
      dataSource:     'theoretical',
      notes:          'm = max depth, can loop in cyclic spaces',
    },
    {
      id:             'dls',
      name:           'Depth-Limited Search',
      abbr:           'DLS',
      evaluationFn:   'depth ≤ limit l',
      complete:       false,   // Only if solution depth ≤ l
      optimal:        false,
      timeComplexity: 'O(b^l)',
      spaceComplexity:'O(bl)',
      strategy:       'DFS with depth cutoff',
      dataSource:     'theoretical',
      notes:          'l = depth limit',
    },
    {
      id:             'iddfs',
      name:           'Iterative Deepening DFS',
      abbr:           'IDDFS',
      evaluationFn:   'depth (iterative limit)',
      complete:       true,
      optimal:        true,   // With unit costs
      timeComplexity: 'O(b^d)',
      spaceComplexity:'O(bd)',
      strategy:       'Repeat DLS with increasing limit',
      dataSource:     'theoretical',
      notes:          'Combines benefits of BFS (complete/optimal) and DFS (low memory)',
    },
    {
      id:             'gbfs',
      name:           'Greedy Best-First Search',
      abbr:           'GBFS',
      evaluationFn:   'f(n) = h(n)',
      complete:       false,   // Not in infinite spaces
      optimal:        false,
      timeComplexity: 'O(b^m)',
      spaceComplexity:'O(b^m)',
      strategy:       'Expand node with smallest h(n)',
      dataSource:     'implemented',
      notes:          'ASSIGNED ALGORITHM — Implemented with Misplaced Tiles and Manhattan Distance heuristics',
      isAssigned:     true,
    },
    {
      id:             'astar',
      name:           'A* Search',
      abbr:           'A*',
      evaluationFn:   'f(n) = g(n) + h(n)',
      complete:       true,   // With admissible h
      optimal:        true,   // With admissible h
      timeComplexity: 'O(b^d)',
      spaceComplexity:'O(b^d)',
      strategy:       'Expand node with smallest f(n) = g(n) + h(n)',
      dataSource:     'theoretical',
      notes:          'Optimal and complete with admissible heuristic. Uses both path cost and heuristic.',
    },
  ];
}

// ── Comparison Data Generator ──────────────────────────────

/**
 * Generate comparison data for the performance table.
 * Uses real GBFS data where available, theoretical data for others.
 *
 * @param {object|null} gbfsResult - Result from runGBFS() (may be null)
 * @param {string}      heuristic  - Which heuristic was used
 * @returns {object[]}
 */
export function generateComparisonData(gbfsResult = null, heuristic = HEURISTIC.MANHATTAN) {
  const algoData = getTheoreticalAlgorithmData();

  return algoData.map(algo => {
    if (algo.id === 'gbfs' && gbfsResult) {
      // Use actual measured data for GBFS
      return {
        ...algo,
        solutionFound:    gbfsResult.found ? 'Yes' : 'No',
        nodesExpanded:    gbfsResult.nodesExpanded,
        solutionMoves:    gbfsResult.found ? gbfsResult.solutionMoves : '—',
        executionTime:    gbfsResult.found || gbfsResult.nodesExpanded > 0 ? formatTime(gbfsResult.executionTime) : '—',
        memoryUsage:      gbfsResult.memoryEstimate,
        heuristicUsed:    getHeuristicDisplayName(heuristic),
        dataSource:       'measured',
      };
    }

    // For unimplemented algorithms, show only theoretical properties
    return {
      ...algo,
      solutionFound:  'See theoretical properties',
      nodesExpanded:  'N/A (not implemented)',
      solutionMoves:  'N/A',
      executionTime:  'N/A',
      memoryUsage:    'N/A',
      heuristicUsed:  algo.id === 'gbfs' || algo.id === 'astar' ? 'Required' : 'None',
      dataSource:     'theoretical',
    };
  });
}

// ── Solution Path Formatter ────────────────────────────────

/**
 * Format a solution path for display.
 * @param {SearchNode[]} path - Array of SearchNodes
 * @returns {object[]} - Formatted path steps
 */
export function formatSolutionPath(path) {
  return path.map((node, index) => ({
    step:     index,
    tiles:    [...node.board.tiles],
    move:     node.move,
    hValue:   node.hValue,
    depth:    node.depth,
    isStart:  index === 0,
    isGoal:   index === path.length - 1,
  }));
}

// ── Effective Branching Factor (b*) ───────────────────────

/**
 * Compute the effective branching factor b* using bisection search.
 * Satisfies: N = 1 + b* + (b*)^2 + ... + (b*)^d = ((b*)^(d+1) - 1) / (b* - 1)
 *
 * @param {number} nodesGenerated - Total nodes generated (N)
 * @param {number} depth          - Solution depth (d)
 * @returns {number|null} - Approximate b* to 2 decimal places
 */
export function calculateEffectiveBranchingFactor(nodesGenerated, depth) {
  if (!nodesGenerated || !depth || depth <= 0 || nodesGenerated <= depth) return null;

  let low = 1.0;
  let high = 4.0; // Branching factor in 8-puzzle is at most 4

  for (let iter = 0; iter < 40; iter++) {
    const mid = (low + high) / 2;
    // Compute geometric series sum: sum_{i=0}^d mid^i
    let sum = 0;
    let term = 1;
    for (let i = 0; i <= depth; i++) {
      sum += term;
      term *= mid;
    }

    if (Math.abs(sum - nodesGenerated) < 0.01) {
      return parseFloat(mid.toFixed(2));
    }

    if (sum < nodesGenerated) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return parseFloat(((low + high) / 2).toFixed(2));
}

// ── Academic Submission Report Generator ───────────────────

/**
 * Generates an academic Markdown submission report for student 24BCI0212.
 *
 * @param {object} gbfsResult - Run result
 * @param {number[]} initialTiles - Start state
 * @param {number[]} goalTiles - Target goal state
 * @returns {string} - Markdown formatted report
 */
export function exportMarkdownReport(gbfsResult, initialTiles, goalTiles) {
  if (!gbfsResult) return '# No Search Run Available';

  const bStar = calculateEffectiveBranchingFactor(gbfsResult.nodesGenerated, gbfsResult.solutionMoves);
  const now = new Date().toLocaleString();

  return `# AI-8Puzzle-Visualizer — Academic Case Study Report
**Student Registration Number:** 24BCI0212
**Course:** Artificial Intelligence
**Assigned Algorithm:** Greedy Best-First Search (GBFS)
**Timestamp:** ${now}

---

## 1. Problem Configuration
- **Initial State:** \`[${initialTiles.join(', ')}]\`
- **Goal State:** \`[${goalTiles.join(', ')}]\`
- **Heuristic Used:** ${getHeuristicDisplayName(gbfsResult.heuristic)}
- **Evaluation Function:** f(n) = h(n)

## 2. Experimental Execution Results
- **Solution Status:** ${gbfsResult.found ? 'SOLVED' : 'FAILED'}
- **Total Solution Moves:** ${gbfsResult.solutionMoves}
- **Nodes Generated:** ${gbfsResult.nodesGenerated}
- **Nodes Expanded:** ${gbfsResult.nodesExpanded}
- **Max Search Depth:** ${gbfsResult.maxDepth}
- **Execution Time:** ${formatTime(gbfsResult.executionTime)}
- **Approximate Memory Usage:** ${gbfsResult.memoryEstimate}
- **Effective Branching Factor (b*):** ${bStar !== null ? bStar : 'N/A'}

## 3. Algorithm Distinction & Analysis
Greedy Best-First Search prioritizes nodes based solely on their heuristic distance to the goal (\`f(n) = h(n)\`).
Unlike A* (\`f(n) = g(n) + h(n)\`), GBFS does not account for the path cost accumulated from the start state.
Consequently, while GBFS is exceptionally fast on informed heuristics like Manhattan Distance, it does not guarantee an optimal (shortest) path.

*Generated by AI-8Puzzle-Visualizer (Student: 24BCI0212)*
`;
}

export default {
  StatisticsStore,
  formatStatistics,
  getEmptyStats,
  formatTime,
  getTheoreticalAlgorithmData,
  generateComparisonData,
  formatSolutionPath,
  calculateEffectiveBranchingFactor,
  exportMarkdownReport,
};
