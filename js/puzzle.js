/**
 * puzzle.js — Core 8-Puzzle Board Model
 * AI-8Puzzle-Visualizer | Student: 24BCI0212
 * Handles board representation, validation, solvability, and successor generation.
 */

'use strict';

// ── Constants ──────────────────────────────────────────────
export const BOARD_SIZE   = 3;   // 3×3 grid
export const TOTAL_TILES  = 9;   // 9 cells (0-8)
export const BLANK_TILE   = 0;   // 0 represents the blank tile

// Move directions: [rowDelta, colDelta, label]
export const MOVES = [
  [-1,  0, 'UP'],
  [ 1,  0, 'DOWN'],
  [ 0, -1, 'LEFT'],
  [ 0,  1, 'RIGHT'],
];

// Default goal state (standard ordering)
export const DEFAULT_GOAL = [1, 2, 3, 4, 5, 6, 7, 8, 0];

// Default initial state (a solvable scramble)
export const DEFAULT_INITIAL = [1, 2, 3, 4, 0, 5, 7, 8, 6];

// ── PuzzleBoard Class ──────────────────────────────────────
export class PuzzleBoard {
  /**
   * @param {number[]} tiles - Array of 9 integers (0-8), 0 = blank
   */
  constructor(tiles) {
    if (!Array.isArray(tiles) || tiles.length !== TOTAL_TILES) {
      throw new Error(`PuzzleBoard: tiles must be an array of exactly ${TOTAL_TILES} integers.`);
    }
    this.tiles = [...tiles];
    this.blankIndex = this.tiles.indexOf(BLANK_TILE);
  }

  /** Return board state as a comma-separated string key */
  toKey() {
    return this.tiles.join(',');
  }

  /** Return a clone of this board */
  clone() {
    return new PuzzleBoard([...this.tiles]);
  }

  /** Convert linear index to [row, col] */
  indexToPos(index) {
    return [Math.floor(index / BOARD_SIZE), index % BOARD_SIZE];
  }

  /** Convert [row, col] to linear index */
  posToIndex(row, col) {
    return row * BOARD_SIZE + col;
  }

  /** Return tile value at given position */
  getTile(row, col) {
    return this.tiles[this.posToIndex(row, col)];
  }

  /** Return blank tile's [row, col] */
  getBlankPos() {
    return this.indexToPos(this.blankIndex);
  }

  /** Check whether this board equals another board (by value) */
  equals(other) {
    return this.toKey() === other.toKey();
  }

  /**
   * Generate all legal successor states by sliding the blank tile.
   * @returns {Array<{board: PuzzleBoard, move: string, blankFrom: number, blankTo: number}>}
   */
  getSuccessors() {
    const successors = [];
    const [bRow, bCol] = this.getBlankPos();

    for (const [dr, dc, label] of MOVES) {
      const newRow = bRow + dr;
      const newCol = bCol + dc;

      // Boundary check
      if (newRow < 0 || newRow >= BOARD_SIZE || newCol < 0 || newCol >= BOARD_SIZE) {
        continue;
      }

      const fromIdx = this.blankIndex;
      const toIdx   = this.posToIndex(newRow, newCol);

      // Swap blank and neighbour tile
      const newTiles = [...this.tiles];
      newTiles[fromIdx] = newTiles[toIdx];
      newTiles[toIdx]   = BLANK_TILE;

      successors.push({
        board:     new PuzzleBoard(newTiles),
        move:      label,
        blankFrom: fromIdx,
        blankTo:   toIdx,
        movedTile: this.tiles[toIdx],
      });
    }

    return successors;
  }

  /**
   * Check if this board is the goal state.
   * @param {PuzzleBoard} goalBoard
   */
  isGoal(goalBoard) {
    return this.equals(goalBoard);
  }

  /** Return a human-readable 3×3 grid string */
  toString() {
    let s = '';
    for (let r = 0; r < BOARD_SIZE; r++) {
      const row = [];
      for (let c = 0; c < BOARD_SIZE; c++) {
        const val = this.getTile(r, c);
        row.push(val === BLANK_TILE ? '_' : String(val));
      }
      s += row.join(' ') + '\n';
    }
    return s.trim();
  }
}

// ── Validation ─────────────────────────────────────────────

/**
 * Validate that an array is a valid 8-puzzle board.
 * @param {number[]} tiles
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validateBoard(tiles) {
  if (!Array.isArray(tiles)) {
    return { valid: false, error: 'Board must be an array.' };
  }

  if (tiles.length !== TOTAL_TILES) {
    return { valid: false, error: `Board must have exactly ${TOTAL_TILES} tiles. Got ${tiles.length}.` };
  }

  for (const t of tiles) {
    if (!Number.isInteger(t) || t < 0 || t > 8) {
      return { valid: false, error: `All tiles must be integers 0–8. Found: ${t}` };
    }
  }

  // Check for duplicates using a set
  const seen = new Set(tiles);
  if (seen.size !== TOTAL_TILES) {
    const dupes = tiles.filter((v, i) => tiles.indexOf(v) !== i);
    return { valid: false, error: `Duplicate tiles detected: ${[...new Set(dupes)].join(', ')}` };
  }

  return { valid: true, error: null };
}

// ── Solvability ────────────────────────────────────────────

/**
 * Count the number of inversions in the tile array.
 * An inversion exists when a tile with a higher number appears before
 * a tile with a lower number (blank tile excluded).
 * @param {number[]} tiles
 * @returns {number}
 */
export function countInversions(tiles) {
  const flat = tiles.filter(t => t !== BLANK_TILE);
  let inversions = 0;
  for (let i = 0; i < flat.length; i++) {
    for (let j = i + 1; j < flat.length; j++) {
      if (flat[i] > flat[j]) inversions++;
    }
  }
  return inversions;
}

/**
 * Determine if a given initial state is solvable relative to a goal state.
 *
 * For a 3×3 board with the goal state having the blank in the last position
 * (standard goal), a configuration is solvable iff the number of inversions
 * is even (both computed relative to the standard row-major ordering).
 *
 * For an arbitrary goal state, we check that the parity of inversions in
 * the initial state matches the parity of inversions in the goal state.
 *
 * @param {number[]} initial  - Initial board tiles
 * @param {number[]} goal     - Goal board tiles
 * @returns {boolean}
 */
export function isSolvable(initial, goal) {
  const initInv = countInversions(initial);
  const goalInv = countInversions(goal);

  // Solvable if inversions have the same parity
  return (initInv % 2) === (goalInv % 2);
}

// ── Random Puzzle Generation ───────────────────────────────

/**
 * Generate a random solvable initial state relative to the given goal.
 * Uses Fisher-Yates shuffle and checks solvability.
 * @param {number[]} goal - Goal board tiles
 * @param {number} maxAttempts
 * @returns {number[]} - Solvable shuffled board
 */
export function generateRandomSolvable(goal = DEFAULT_GOAL, maxAttempts = 1000) {
  const tiles = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Fisher-Yates shuffle
    const shuffled = [...tiles];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Don't return the goal state itself
    if (shuffled.join(',') === goal.join(',')) continue;

    // Check solvability
    if (isSolvable(shuffled, goal)) {
      return shuffled;
    }
  }

  // Fallback: guaranteed solvable by flipping parity
  const base = [...goal];
  // Swap first two non-blank tiles to flip parity
  let i = 0, j = 1;
  while (base[i] === BLANK_TILE) i++;
  while (base[j] === BLANK_TILE || j === i) j++;
  [base[i], base[j]] = [base[j], base[i]];
  return base;
}

// ── Utility Functions ──────────────────────────────────────

/**
 * Build a lookup map: tile value -> goal position index.
 * Used by heuristic functions.
 * @param {number[]} goalTiles
 * @returns {Map<number, number>}
 */
export function buildGoalPositionMap(goalTiles) {
  const map = new Map();
  for (let i = 0; i < goalTiles.length; i++) {
    map.set(goalTiles[i], i);
  }
  return map;
}

/**
 * Parse a 9-element tiles array from a comma/space/newline separated string.
 * @param {string} str
 * @returns {number[]|null}
 */
export function parseTilesFromString(str) {
  const tokens = str.trim().split(/[\s,]+/);
  if (tokens.length !== TOTAL_TILES) return null;
  const tiles = tokens.map(Number);
  if (tiles.some(isNaN)) return null;
  return tiles;
}

/**
 * Format tiles array for display (human readable 3x3)
 * @param {number[]} tiles
 * @returns {string}
 */
export function formatBoard(tiles) {
  const rows = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      const v = tiles[r * BOARD_SIZE + c];
      row.push(v === BLANK_TILE ? '▢' : String(v));
    }
    rows.push(row.join(' '));
  }
  return rows.join('\n');
}

/**
 * Deep copy a tiles array.
 * @param {number[]} tiles
 * @returns {number[]}
 */
export function copyTiles(tiles) {
  return [...tiles];
}

export default PuzzleBoard;
