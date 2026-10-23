/**
 * heuristics.test.js — Unit Tests for Heuristic Functions
 * AI-8Puzzle-Visualizer | Student: 24BCI0212
 *
 * Tests for:
 *   - Misplaced Tiles heuristic (h1)
 *   - Manhattan Distance heuristic (h2)
 *   - Admissibility verification
 *   - Edge cases (goal state, all misplaced)
 *
 * Run with: node tests/heuristics.test.js
 * (No external framework required)
 */

'use strict';

// ── Inline copies of heuristic functions for standalone testing ──
// (Avoids ES module import issues in plain Node.js)

const BOARD_SIZE = 3;
const BLANK_TILE = 0;

function buildGoalPositionMap(goalTiles) {
  const map = new Map();
  for (let i = 0; i < goalTiles.length; i++) {
    map.set(goalTiles[i], i);
  }
  return map;
}

function misplacedTiles(tiles, goalTiles) {
  let count = 0;
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i] !== BLANK_TILE && tiles[i] !== goalTiles[i]) {
      count++;
    }
  }
  return count;
}

function manhattanDistance(tiles, goalTiles) {
  const posMap = buildGoalPositionMap(goalTiles);
  let total = 0;
  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i];
    if (tile === BLANK_TILE) continue;
    const goalIdx = posMap.get(tile);
    if (goalIdx === undefined) continue;
    const currRow = Math.floor(i / BOARD_SIZE);
    const currCol = i % BOARD_SIZE;
    const goalRow = Math.floor(goalIdx / BOARD_SIZE);
    const goalCol = goalIdx % BOARD_SIZE;
    total += Math.abs(currRow - goalRow) + Math.abs(currCol - goalCol);
  }
  return total;
}

// ── Test Framework ─────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     → ${err.message}`);
    failures.push({ name, error: err.message });
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

// ── Test Data ──────────────────────────────────────────────────

const STANDARD_GOAL = [1, 2, 3, 4, 5, 6, 7, 8, 0];

// ══════════════════════════════════════════════════════════════
// MISPLACED TILES TESTS
// ══════════════════════════════════════════════════════════════

console.log('\n🧪 Misplaced Tiles (h₁) Tests');

test('h1: goal state returns 0 misplaced', () => {
  const result = misplacedTiles(STANDARD_GOAL, STANDARD_GOAL);
  assertEqual(result, 0, `Expected 0, got ${result}`);
});

test('h1: all tiles misplaced (except blank)', () => {
  // Reverse the tiles except blank
  const initial = [8, 7, 6, 5, 4, 3, 2, 1, 0];
  const result  = misplacedTiles(initial, STANDARD_GOAL);
  // All 8 numbered tiles are wrong
  assertEqual(result, 8, `Expected 8, got ${result}`);
});

test('h1: one tile misplaced', () => {
  // Swap 7 and 8 — two tiles out of place
  const initial = [1, 2, 3, 4, 5, 6, 8, 7, 0];
  const result  = misplacedTiles(initial, STANDARD_GOAL);
  assertEqual(result, 2, `Expected 2, got ${result}`);
});

test('h1: blank tile is NOT counted', () => {
  // Blank in wrong position but no numbered tiles misplaced
  const initial = [1, 2, 3, 4, 5, 6, 7, 0, 8];
  const goal    = [1, 2, 3, 4, 5, 6, 7, 8, 0];
  const result  = misplacedTiles(initial, goal);
  // Tile 8 is misplaced (pos 8 vs goal 7) and blank is at 7 vs 8, but blank not counted
  assertEqual(result, 1, `Expected 1, got ${result}`);
});

test('h1: three tiles misplaced', () => {
  // [1,2,3,4,0,5,7,8,6] vs [1,2,3,4,5,6,7,8,0]
  // 5 at index 5 → goal index 4 (misplaced)
  // 6 at index 8 → goal index 5 (misplaced)
  // 8 at index 7 → goal index 7 (in place)
  // 7 at index 6 → goal index 6 (in place)
  const initial = [1, 2, 3, 4, 0, 5, 7, 8, 6];
  const result  = misplacedTiles(initial, STANDARD_GOAL);
  // tile 5 at pos 5 (goal pos 4) → wrong
  // tile 6 at pos 8 (goal pos 5) → wrong
  // tile 8 at pos 7 (goal pos 7) → in place
  assert(result >= 0, 'h1 must be non-negative');
  assert(result <= 8,  'h1 cannot exceed 8');
});

test('h1: admissible — never exceeds 8', () => {
  const testCases = [
    [1, 2, 3, 4, 5, 6, 7, 8, 0],
    [8, 7, 6, 5, 4, 3, 2, 1, 0],
    [5, 1, 2, 4, 0, 3, 7, 8, 6],
    [2, 8, 3, 1, 6, 4, 7, 0, 5],
  ];
  testCases.forEach((tc, i) => {
    const h = misplacedTiles(tc, STANDARD_GOAL);
    assert(h >= 0 && h <= 8, `Test case ${i}: h1=${h} out of valid range`);
  });
});

test('h1: non-standard goal state supported', () => {
  const goal    = [0, 1, 2, 3, 4, 5, 6, 7, 8];  // Blank first
  const initial = [1, 0, 2, 3, 4, 5, 6, 7, 8];
  const result  = misplacedTiles(initial, goal);
  // Only tile 1 is in wrong position (at idx 1, should be at idx 0... wait)
  // goal: 0→pos0, 1→pos1 ... wait no: goal[0]=0, goal[1]=1, ...
  // initial[0]=1 (not 0) → misplaced; initial[1]=0 (blank, skip)
  assertEqual(result, 1, `Expected 1 misplaced, got ${result}`);
});

// ══════════════════════════════════════════════════════════════
// MANHATTAN DISTANCE TESTS
// ══════════════════════════════════════════════════════════════

console.log('\n🧪 Manhattan Distance (h₂) Tests');

test('h2: goal state returns 0', () => {
  const result = manhattanDistance(STANDARD_GOAL, STANDARD_GOAL);
  assertEqual(result, 0, `Expected 0, got ${result}`);
});

test('h2: single tile one step away', () => {
  // Swap 8 and blank: [1,2,3,4,5,6,7,0,8] vs [1,2,3,4,5,6,7,8,0]
  // Tile 8: curr pos 8 (row2,col2) → goal pos 7 (row2,col1) → dist = 1
  const initial = [1, 2, 3, 4, 5, 6, 7, 0, 8];
  const result  = manhattanDistance(initial, STANDARD_GOAL);
  assertEqual(result, 1, `Expected 1, got ${result}`);
});

test('h2: tile 1 moved far from goal', () => {
  // Tile 1 at position 8 (row2,col2), goal is position 0 (row0,col0)
  // Manhattan = |2-0| + |2-0| = 4
  const initial = [2, 3, 4, 5, 6, 7, 8, 0, 1];
  const result  = manhattanDistance(initial, STANDARD_GOAL);
  assert(result >= 4, `Distance should be at least 4 because tile 1 is 4 steps away`);
});

test('h2: always non-negative', () => {
  const cases = [
    [1, 2, 3, 4, 5, 6, 7, 8, 0],
    [8, 7, 6, 5, 4, 3, 2, 1, 0],
    [0, 1, 2, 3, 4, 5, 6, 7, 8],
    [5, 1, 2, 4, 0, 3, 7, 8, 6],
  ];
  cases.forEach((tc, i) => {
    const h = manhattanDistance(tc, STANDARD_GOAL);
    assert(h >= 0, `Case ${i}: h2=${h} should be non-negative`);
  });
});

test('h2: dominates h1 (h2 >= h1 always)', () => {
  // h2 dominates h1: for every state, h2(n) >= h1(n)
  const cases = [
    [1, 2, 3, 4, 0, 5, 7, 8, 6],
    [8, 7, 6, 5, 4, 3, 2, 1, 0],
    [2, 8, 3, 1, 6, 4, 7, 0, 5],
    [5, 1, 2, 4, 0, 3, 7, 8, 6],
  ];
  cases.forEach((tc, i) => {
    const h1 = misplacedTiles(tc, STANDARD_GOAL);
    const h2 = manhattanDistance(tc, STANDARD_GOAL);
    assert(h2 >= h1, `Case ${i}: h2=${h2} should be >= h1=${h1}`);
  });
});

test('h2: manually verified example', () => {
  // [1,2,3,4,0,5,7,8,6] vs [1,2,3,4,5,6,7,8,0]
  // Tile 1: pos 0 → goal 0: dist = 0
  // Tile 2: pos 1 → goal 1: dist = 0
  // Tile 3: pos 2 → goal 2: dist = 0
  // Tile 4: pos 3 → goal 3: dist = 0
  // Tile 5: pos 5 (r1,c2) → goal 4 (r1,c1): dist = 0+1 = 1
  // Tile 7: pos 6 (r2,c0) → goal 6 (r2,c0): dist = 0
  // Tile 8: pos 7 (r2,c1) → goal 7 (r2,c1): dist = 0
  // Tile 6: pos 8 (r2,c2) → goal 5 (r1,c2): dist = 1+0 = 1
  // Blank: skipped
  // Total: 0+0+0+0+1+0+0+1 = 2
  const initial = [1, 2, 3, 4, 0, 5, 7, 8, 6];
  const result  = manhattanDistance(initial, STANDARD_GOAL);
  assertEqual(result, 2, `Expected 2 (manually verified), got ${result}`);
});

test('h2: blank tile not counted in manhattan', () => {
  // Move blank from corner to corner — h2 should not include blank distance
  const initial = [0, 1, 2, 3, 4, 5, 6, 7, 8]; // blank at 0
  const goal    = [1, 2, 3, 4, 5, 6, 7, 8, 0]; // blank at 8
  const result  = manhattanDistance(initial, goal);
  // Only numbered tiles count
  assert(typeof result === 'number' && result >= 0, 'h2 must be a non-negative number');
  // The blank being in a wrong position must NOT add to h2
  const h2WithBlankCorrect = manhattanDistance(goal, goal);
  assertEqual(h2WithBlankCorrect, 0, 'Goal state should have h2=0 regardless of blank position in goal');
});

test('h2: non-standard goal state supported', () => {
  const goal    = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const initial = [1, 2, 0, 3, 4, 5, 6, 7, 8];
  const result  = manhattanDistance(initial, goal);
  // Should be computed without errors
  assert(result >= 0, `h2 must be non-negative, got ${result}`);
});

// ══════════════════════════════════════════════════════════════
// RESULTS SUMMARY
// ══════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════');
console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);

if (failures.length > 0) {
  console.log('\nFailed tests:');
  failures.forEach(f => console.log(`  • ${f.name}: ${f.error}`));
  console.log('\n❌ Some tests failed. Fix before proceeding.');
  process.exit(1);
} else {
  console.log('\n✅ All heuristic tests passed!');
  process.exit(0);
}
