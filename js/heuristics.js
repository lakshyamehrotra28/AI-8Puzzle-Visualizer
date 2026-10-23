/**
 * heuristics.js — Heuristic Functions for 8-Puzzle
 * AI-8Puzzle-Visualizer | Student: 24BCI0212
 *
 * Implements two admissible heuristics for use with GBFS:
 *   1. Misplaced Tiles (h1)
 *   2. Manhattan Distance (h2)
 *
 * Both heuristics:
 *   - Exclude the blank tile (tile 0) from computation.
 *   - Support arbitrary valid goal states.
 *   - Are admissible: they never overestimate the true cost.
 *   - h2 (Manhattan Distance) dominates h1 (Misplaced Tiles).
 *
 * Mathematical Definitions:
 * ─────────────────────────
 * h1(n) = Σ [tile_i ≠ goal_i AND tile_i ≠ 0]  for i = 0..8
 *
 * h2(n) = Σ (|current_row(t) − goal_row(t)| + |current_col(t) − goal_col(t)|)
 *          for each tile t ≠ 0
 *
 * For GBFS: f(n) = h(n)  [no path cost g(n)]
 */

'use strict';

import { BOARD_SIZE, BLANK_TILE, buildGoalPositionMap } from './puzzle.js';

// ── Heuristic ID constants ─────────────────────────────────
export const HEURISTIC = {
  MISPLACED: 'misplaced',
  MANHATTAN: 'manhattan',
};

// ── Misplaced Tiles (h1) ───────────────────────────────────

/**
 * Count tiles that are NOT in their goal position.
 * The blank tile (0) is excluded.
 *
 * h1(n) = number of tiles t such that t ≠ 0 AND position(t) ≠ goalPosition(t)
 *
 * @param {number[]} tiles     - Current board state (array of 9 ints)
 * @param {number[]} goalTiles - Goal board state (array of 9 ints)
 * @returns {number} - Non-negative integer heuristic value
 */
export function misplacedTiles(tiles, goalTiles) {
  if (!tiles || !goalTiles) return Infinity;

  let count = 0;
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i] !== BLANK_TILE && tiles[i] !== goalTiles[i]) {
      count++;
    }
  }
  return count;
}

// ── Manhattan Distance (h2) ────────────────────────────────

/**
 * Sum of Manhattan distances of each tile from its goal position.
 * The blank tile (0) is excluded.
 *
 * h2(n) = Σ ( |curr_row(t) - goal_row(t)| + |curr_col(t) - goal_col(t)| )
 *
 * Manhattan distance for tile t:
 *   curr_row = floor(currentIndex / 3)
 *   curr_col = currentIndex % 3
 *   goal_row = floor(goalIndex / 3)
 *   goal_col = goalIndex % 3
 *
 * @param {number[]} tiles     - Current board state
 * @param {number[]} goalTiles - Goal board state
 * @param {Map<number,number>} [goalMap] - Pre-built goal position map (optional, for performance)
 * @returns {number} - Non-negative integer heuristic value
 */
export function manhattanDistance(tiles, goalTiles, goalMap = null) {
  if (!tiles || !goalTiles) return Infinity;

  // Build goal position map if not provided
  const posMap = goalMap || buildGoalPositionMap(goalTiles);

  let total = 0;
  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i];
    if (tile === BLANK_TILE) continue;  // Skip blank tile

    const goalIdx = posMap.get(tile);
    if (goalIdx === undefined) continue; // Safety check

    const currRow = Math.floor(i / BOARD_SIZE);
    const currCol = i % BOARD_SIZE;
    const goalRow = Math.floor(goalIdx / BOARD_SIZE);
    const goalCol = goalIdx % BOARD_SIZE;

    total += Math.abs(currRow - goalRow) + Math.abs(currCol - goalCol);
  }

  return total;
}

// ── Heuristic Dispatcher ───────────────────────────────────

/**
 * Compute the heuristic value for the given state.
 * @param {string}   heuristicId  - 'misplaced' | 'manhattan'
 * @param {number[]} tiles        - Current board tiles
 * @param {number[]} goalTiles    - Goal board tiles
 * @param {Map}      [goalMap]    - Pre-built goal position map (optional)
 * @returns {number}
 */
export function computeHeuristic(heuristicId, tiles, goalTiles, goalMap = null) {
  switch (heuristicId) {
    case HEURISTIC.MISPLACED:
      return misplacedTiles(tiles, goalTiles);
    case HEURISTIC.MANHATTAN:
      return manhattanDistance(tiles, goalTiles, goalMap);
    default:
      throw new Error(`Unknown heuristic: "${heuristicId}". Use 'misplaced' or 'manhattan'.`);
  }
}

// ── Heuristic Metadata ─────────────────────────────────────

/**
 * Return display metadata for a heuristic.
 * @param {string} heuristicId
 * @returns {{ name: string, symbol: string, formula: string, description: string }}
 */
export function getHeuristicInfo(heuristicId) {
  const INFO = {
    [HEURISTIC.MISPLACED]: {
      name:        'Misplaced Tiles',
      symbol:      'h₁(n)',
      formula:     'h₁(n) = Σ [tile_i ≠ goal_i AND tile_i ≠ 0]',
      description: 'Counts the number of tiles not in their goal position. Each misplaced tile requires at least one move to reach its goal, so this heuristic is admissible. It is less informed than Manhattan Distance.',
      admissible:  true,
      consistent:  true,
      dominatedBy: 'Manhattan Distance',
    },
    [HEURISTIC.MANHATTAN]: {
      name:        'Manhattan Distance',
      symbol:      'h₂(n)',
      formula:     'h₂(n) = Σ (|currRow(t) - goalRow(t)| + |currCol(t) - goalCol(t)|)',
      description: 'Sums the horizontal and vertical distances each tile must travel to reach its goal. It is admissible because tiles can only slide horizontally or vertically, and each step covers exactly one unit of distance. Dominates Misplaced Tiles.',
      admissible:  true,
      consistent:  true,
      dominates:   'Misplaced Tiles',
    },
  };

  if (!INFO[heuristicId]) {
    throw new Error(`Unknown heuristic ID: "${heuristicId}"`);
  }

  return INFO[heuristicId];
}

// ── Comparison Helper ──────────────────────────────────────

/**
 * Compare two heuristic values for a given state.
 * Used for educational comparison display.
 * @param {number[]} tiles
 * @param {number[]} goalTiles
 * @returns {{ misplaced: number, manhattan: number }}
 */
export function compareHeuristics(tiles, goalTiles) {
  const goalMap = buildGoalPositionMap(goalTiles);
  return {
    misplaced: misplacedTiles(tiles, goalTiles),
    manhattan: manhattanDistance(tiles, goalTiles, goalMap),
  };
}

/**
 * Granular tile-by-tile heuristic diagnostic breakdown.
 * Generates coordinate analysis for educational inspection in the UI and Viva demonstration.
 *
 * @param {number[]} tiles     - Current board
 * @param {number[]} goalTiles - Target goal board
 * @returns {Array<{tile: number, currentPos: [number, number], goalPos: [number, number], isMisplaced: boolean, manhattanDist: number}>}
 */
export function getTileBreakdown(tiles, goalTiles) {
  const goalMap = buildGoalPositionMap(goalTiles);
  const breakdown = [];

  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i];
    if (tile === BLANK_TILE) continue;

    const goalIdx = goalMap.get(tile);
    const currRow = Math.floor(i / BOARD_SIZE);
    const currCol = i % BOARD_SIZE;
    const goalRow = goalIdx !== undefined ? Math.floor(goalIdx / BOARD_SIZE) : -1;
    const goalCol = goalIdx !== undefined ? goalIdx % BOARD_SIZE : -1;

    const isMisplaced = i !== goalIdx;
    const manhattanDist = (goalIdx !== undefined)
      ? Math.abs(currRow - goalRow) + Math.abs(currCol - goalCol)
      : 0;

    breakdown.push({
      tile,
      currentPos: [currRow, currCol],
      goalPos: [goalRow, goalCol],
      isMisplaced,
      manhattanDist
    });
  }

  // Sort by tile number 1..8
  breakdown.sort((a, b) => a.tile - b.tile);
  return breakdown;
}

// ── Verify Admissibility (helper for tests) ────────────────

/**
 * Verify that h(n) ≤ h*(n) for a specific node.
 * This is a diagnostic tool, not used during search.
 * Returns true if the heuristic value does not exceed the provided actual cost.
 * @param {number} hValue    - Computed heuristic value
 * @param {number} trueCost  - Known true cost to goal
 * @returns {boolean}
 */
export function isAdmissible(hValue, trueCost) {
  return hValue <= trueCost;
}

export default {
  HEURISTIC,
  misplacedTiles,
  manhattanDistance,
  computeHeuristic,
  getHeuristicInfo,
  compareHeuristics,
  getTileBreakdown,
  isAdmissible,
};

/** JSDoc: Heuristic function mathematical contracts */

export function calculateInformativenessRatio(h1, h2) { return h1 === 0 ? 1 : h2 / h1; }
