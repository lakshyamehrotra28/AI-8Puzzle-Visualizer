/**
 * puzzle.test.js — Unit Tests for Puzzle Board Model
 * AI-8Puzzle-Visualizer | Student: 24BCI0212
 *
 * Tests for:
 *   - Board validation
 *   - Duplicate detection
 *   - Missing tile detection
 *   - Successor generation
 *   - Boundary move checking
 *   - Solvability check
 *
 * Run with: node tests/puzzle.test.js
 */

'use strict';

// ── Inline board logic for standalone testing ──────────────────

const BOARD_SIZE  = 3;
const TOTAL_TILES = 9;
const BLANK_TILE  = 0;

const MOVES = [
  [-1,  0, 'UP'],
  [ 1,  0, 'DOWN'],
  [ 0, -1, 'LEFT'],
  [ 0,  1, 'RIGHT'],
];

function validateBoard(tiles) {
  if (!Array.isArray(tiles)) return { valid: false, error: 'Must be an array.' };
  if (tiles.length !== TOTAL_TILES) return { valid: false, error: `Must have ${TOTAL_TILES} tiles. Got ${tiles.length}.` };
  for (const t of tiles) {
    if (!Number.isInteger(t) || t < 0 || t > 8) return { valid: false, error: `Invalid tile: ${t}` };
  }
  const seen = new Set(tiles);
  if (seen.size !== TOTAL_TILES) {
    const dupes = tiles.filter((v,i) => tiles.indexOf(v) !== i);
    return { valid: false, error: `Duplicate tiles: ${[...new Set(dupes)].join(',')}` };
  }
  return { valid: true, error: null };
}

function getSuccessors(tiles) {
  const blankIdx = tiles.indexOf(BLANK_TILE);
  const bRow = Math.floor(blankIdx / BOARD_SIZE);
  const bCol = blankIdx % BOARD_SIZE;
  const successors = [];

  for (const [dr, dc, label] of MOVES) {
    const nr = bRow + dr;
    const nc = bCol + dc;
    if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue;

    const toIdx = nr * BOARD_SIZE + nc;
    const newTiles = [...tiles];
    newTiles[blankIdx] = newTiles[toIdx];
    newTiles[toIdx]    = BLANK_TILE;
    successors.push({ tiles: newTiles, move: label });
  }
  return successors;
}

function countInversions(tiles) {
  const flat = tiles.filter(t => t !== BLANK_TILE);
  let inv = 0;
  for (let i = 0; i < flat.length; i++)
    for (let j = i+1; j < flat.length; j++)
      if (flat[i] > flat[j]) inv++;
  return inv;
}

function isSolvable(initial, goal) {
  return (countInversions(initial) % 2) === (countInversions(goal) % 2);
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
  } catch(err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     → ${err.message}`);
    failures.push({ name, error: err.message });
    failed++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

function assertEqual(a, e, msg) {
  if (a !== e) throw new Error(msg || `Expected ${e}, got ${a}`);
}

// ══════════════════════════════════════════════════════════════
// VALIDATION TESTS
// ══════════════════════════════════════════════════════════════

console.log('\n🧪 Board Validation Tests');

test('valid board accepted', () => {
  const r = validateBoard([1,2,3,4,5,6,7,8,0]);
  assert(r.valid, `Should be valid but got: ${r.error}`);
});

test('wrong length rejected (8 elements)', () => {
  const r = validateBoard([1,2,3,4,5,6,7,8]);
  assert(!r.valid, 'Should be invalid with 8 elements');
});

test('wrong length rejected (10 elements)', () => {
  const r = validateBoard([0,1,2,3,4,5,6,7,8,9]);
  assert(!r.valid, 'Should be invalid with 10 elements');
});

test('duplicate tile detected', () => {
  const r = validateBoard([1,2,3,4,5,6,7,1,0]);
  assert(!r.valid, 'Should detect duplicate tile 1');
  assert(r.error.includes('Duplicate') || r.error.includes('duplicate'), 'Error message should mention duplicate');
});

test('out-of-range tile rejected', () => {
  const r = validateBoard([1,2,3,4,5,6,7,8,9]);
  assert(!r.valid, 'Tile 9 is out of range');
});

test('negative tile rejected', () => {
  const r = validateBoard([1,2,3,4,5,6,7,-1,0]);
  assert(!r.valid, 'Negative tile should be rejected');
});

test('non-array rejected', () => {
  const r = validateBoard('12345678');
  assert(!r.valid, 'String should not be accepted');
});

test('null rejected', () => {
  const r = validateBoard(null);
  assert(!r.valid, 'Null should not be accepted');
});

test('missing tile 4 detected', () => {
  // Missing 4, has extra 8
  const r = validateBoard([1,2,3,8,5,6,7,8,0]);
  assert(!r.valid, 'Should detect missing tile 4 (via duplicate 8)');
});

test('blank tile (0) is valid', () => {
  const r = validateBoard([0,1,2,3,4,5,6,7,8]);
  assert(r.valid, '0 should be accepted as the blank tile');
});

// ══════════════════════════════════════════════════════════════
// SUCCESSOR GENERATION TESTS
// ══════════════════════════════════════════════════════════════

console.log('\n🧪 Successor Generation Tests');

test('blank in center: 4 successors', () => {
  // Blank at index 4 (center)
  const initial = [1,2,3,4,0,5,7,8,6];
  const succs = getSuccessors(initial);
  assertEqual(succs.length, 4, `Center blank should have 4 successors, got ${succs.length}`);
});

test('blank in corner: 2 successors', () => {
  // Blank at index 0 (top-left)
  const initial = [0,1,2,3,4,5,6,7,8];
  const succs = getSuccessors(initial);
  assertEqual(succs.length, 2, `Corner blank should have 2 successors, got ${succs.length}`);
});

test('blank in edge center: 3 successors', () => {
  // Blank at index 1 (top-center)
  const initial = [1,0,2,3,4,5,6,7,8];
  const succs = getSuccessors(initial);
  assertEqual(succs.length, 3, `Edge-center blank should have 3 successors, got ${succs.length}`);
});

test('blank in bottom-right corner: 2 successors', () => {
  const initial = [1,2,3,4,5,6,7,8,0];
  const succs = getSuccessors(initial);
  assertEqual(succs.length, 2, `Bottom-right corner should have 2 successors, got ${succs.length}`);
});

test('successors do not duplicate the parent state', () => {
  const initial = [1,2,3,4,0,5,7,8,6];
  const key = initial.join(',');
  const succs = getSuccessors(initial);
  succs.forEach((s, i) => {
    assert(s.tiles.join(',') !== key, `Successor ${i} should differ from parent`);
  });
});

test('successor blank tile is in valid position', () => {
  const initial = [1,2,3,4,0,5,7,8,6];
  const succs = getSuccessors(initial);
  succs.forEach((s, i) => {
    const blankIdx = s.tiles.indexOf(0);
    assert(blankIdx >= 0 && blankIdx < 9, `Successor ${i}: blank at invalid index ${blankIdx}`);
  });
});

test('all successors are valid boards', () => {
  const initial = [1,2,3,4,0,5,7,8,6];
  const succs = getSuccessors(initial);
  succs.forEach((s, i) => {
    const v = validateBoard(s.tiles);
    assert(v.valid, `Successor ${i} failed validation: ${v.error}`);
  });
});

test('successor has exactly one tile moved', () => {
  const initial = [1,2,3,4,0,5,7,8,6];
  const succs = getSuccessors(initial);
  succs.forEach((s, i) => {
    let diffs = 0;
    for (let j = 0; j < 9; j++) {
      if (s.tiles[j] !== initial[j]) diffs++;
    }
    assertEqual(diffs, 2, `Successor ${i}: expected 2 positions to change (blank+tile), got ${diffs}`);
  });
});

test('UP move moves tile from row below blank', () => {
  // Blank at index 4 (row1,col1). UP should bring tile from row0 down.
  // Wait: UP means blank moves up, so tile moves DOWN into blank's position.
  // Actually: UP means the tile ABOVE the blank slides DOWN into blank.
  const initial = [1,2,3,4,0,5,7,8,6];
  const succs = getSuccessors(initial);
  const upMove = succs.find(s => s.move === 'UP');
  assert(upMove, 'Should have an UP move');
  // Tile 2 (at pos 1, row0,col1) should move to pos 4 (row1,col1)
  assertEqual(upMove.tiles[4], 2, 'Tile 2 should move down into blank position on UP move');
  assertEqual(upMove.tiles[1], 0, 'Original tile 2 position should become blank');
});

// ══════════════════════════════════════════════════════════════
// SOLVABILITY TESTS
// ══════════════════════════════════════════════════════════════

console.log('\n🧪 Solvability Tests');

test('goal state is solvable from itself', () => {
  const goal = [1,2,3,4,5,6,7,8,0];
  assert(isSolvable(goal, goal), 'Goal from goal should be solvable');
});

test('known solvable puzzle is recognized', () => {
  const initial = [1,2,3,4,0,5,7,8,6];
  const goal    = [1,2,3,4,5,6,7,8,0];
  assert(isSolvable(initial, goal), 'This puzzle is known to be solvable');
});

test('known unsolvable puzzle is rejected', () => {
  // Swapping tiles 1 and 2 creates an unsolvable puzzle (flips parity)
  const initial = [2,1,3,4,5,6,7,8,0];
  const goal    = [1,2,3,4,5,6,7,8,0];
  assert(!isSolvable(initial, goal), 'Swapping 1 and 2 should make puzzle unsolvable');
});

test('inversion count is correct for standard goal', () => {
  const goal = [1,2,3,4,5,6,7,8,0];
  const inv  = countInversions(goal);
  assertEqual(inv, 0, `Standard goal should have 0 inversions, got ${inv}`);
});

test('inversion count for [2,1,3,...] is 1', () => {
  const tiles = [2,1,3,4,5,6,7,8,0];
  const inv   = countInversions(tiles);
  assertEqual(inv, 1, `[2,1,...] should have 1 inversion, got ${inv}`);
});

test('parity invariance: legal moves strictly preserve inversion parity mod 2', () => {
  let state = [1,2,3,4,5,6,7,8,0];
  const initialParity = countInversions(state) % 2;
  for (let step = 0; step < 200; step++) {
    const succs = getSuccessors(state);
    const next = succs[Math.floor(Math.random() * succs.length)].tiles;
    const nextParity = countInversions(next) % 2;
    assertEqual(nextParity, initialParity, `Parity broken at transition step ${step}`);
    state = next;
  }
});

test('solvability: non-standard goal states matching parity', () => {
  const goalEven = [8,7,6,5,4,3,2,1,0]; // 28 inversions -> even
  const startEven = [1,2,3,4,5,6,7,8,0]; // 0 inversions -> even
  const startOdd = [2,1,3,4,5,6,7,8,0];  // 1 inversion -> odd
  assert(isSolvable(startEven, goalEven), 'Even start should be solvable to even goal');
  assert(!isSolvable(startOdd, goalEven), 'Odd start should NOT be solvable to even goal');
});

// ══════════════════════════════════════════════════════════════
// RESULTS SUMMARY
// ══════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════');
console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);

if (failures.length > 0) {
  console.log('\nFailed tests:');
  failures.forEach(f => console.log(`  • ${f.name}: ${f.error}`));
  console.log('\n❌ Fix failures before continuing.');
  process.exit(1);
} else {
  console.log('\n✅ All puzzle tests passed!');
  process.exit(0);
}
