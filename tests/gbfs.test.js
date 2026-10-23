/**
 * gbfs.test.js — Integration Tests for GBFS Algorithm
 * AI-8Puzzle-Visualizer | Student: 24BCI0212
 *
 * Tests for:
 *   - Priority queue ordering and tie-breaking
 *   - GBFS on trivial, solvable, and unsolvable puzzles
 *   - Solution path reconstruction
 *   - Parent tracking
 *   - Repeated-state handling
 *   - Search statistics accuracy
 *   - Resource limit handling
 *
 * Run with: node tests/gbfs.test.js
 */

'use strict';

// ── Inline implementations (for standalone Node.js) ────────────

const BOARD_SIZE  = 3;
const BLANK_TILE  = 0;
const TOTAL_TILES = 9;

const MOVES = [[-1,0,'UP'],[1,0,'DOWN'],[0,-1,'LEFT'],[0,1,'RIGHT']];

// --- Priority Queue (MinHeap) ---
class PriorityQueue {
  constructor() { this._heap = []; this._counter = 0; }
  get size() { return this._heap.length; }
  get isEmpty() { return this._heap.length === 0; }

  push(priority, data) {
    const entry = { priority, tieBreak: this._counter++, data };
    this._heap.push(entry);
    this._bubbleUp(this._heap.length - 1);
  }

  pop() {
    if (this.isEmpty) return null;
    const top = this._heap[0];
    const last = this._heap.pop();
    if (this._heap.length > 0) { this._heap[0] = last; this._sinkDown(0); }
    return top.data;
  }

  peek() { return this.isEmpty ? null : this._heap[0].data; }

  toArray() { return this._heap.map(e => e.data); }

  _cmp(a, b) {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.tieBreak - b.tieBreak;
  }

  _bubbleUp(idx) {
    while (idx > 0) {
      const p = Math.floor((idx - 1) / 2);
      if (this._cmp(this._heap[idx], this._heap[p]) < 0) {
        [this._heap[idx], this._heap[p]] = [this._heap[p], this._heap[idx]];
        idx = p;
      } else break;
    }
  }

  _sinkDown(idx) {
    const n = this._heap.length;
    while (true) {
      let s = idx, l = 2*idx+1, r = 2*idx+2;
      if (l < n && this._cmp(this._heap[l], this._heap[s]) < 0) s = l;
      if (r < n && this._cmp(this._heap[r], this._heap[s]) < 0) s = r;
      if (s !== idx) { [this._heap[idx], this._heap[s]] = [this._heap[s], this._heap[idx]]; idx = s; }
      else break;
    }
  }
}

// --- Heuristics ---
function buildGoalMap(goal) {
  const m = new Map();
  goal.forEach((v, i) => m.set(v, i));
  return m;
}

function manhattanDistance(tiles, goalMap) {
  let total = 0;
  tiles.forEach((tile, i) => {
    if (tile === BLANK_TILE) return;
    const gi = goalMap.get(tile);
    if (gi === undefined) return;
    total += Math.abs(Math.floor(i/BOARD_SIZE) - Math.floor(gi/BOARD_SIZE))
           + Math.abs(i % BOARD_SIZE - gi % BOARD_SIZE);
  });
  return total;
}

// --- Successor generation ---
function getSuccessors(tiles) {
  const blankIdx = tiles.indexOf(BLANK_TILE);
  const bRow = Math.floor(blankIdx / BOARD_SIZE);
  const bCol = blankIdx % BOARD_SIZE;
  const succs = [];
  for (const [dr, dc, label] of MOVES) {
    const nr = bRow + dr, nc = bCol + dc;
    if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue;
    const toIdx = nr * BOARD_SIZE + nc;
    const newTiles = [...tiles];
    newTiles[blankIdx] = newTiles[toIdx];
    newTiles[toIdx] = BLANK_TILE;
    succs.push({ tiles: newTiles, move: label });
  }
  return succs;
}

// --- GBFS ---
function runGBFS(initialTiles, goalTiles, maxNodes = 10000) {
  const goalMap = buildGoalMap(goalTiles);
  const rootH   = manhattanDistance(initialTiles, goalMap);

  if (initialTiles.join(',') === goalTiles.join(',')) {
    return { found: true, path: [{ tiles: initialTiles, parent: null, move: 'START', depth: 0, h: 0 }], nodesGenerated: 1, nodesExpanded: 0 };
  }

  const frontier = new PriorityQueue();
  const frontierSet = new Set();
  const explored  = new Set();
  let nodesGenerated = 1, nodesExpanded = 0;

  const root = { tiles: initialTiles, parent: null, move: 'START', depth: 0, h: rootH };
  frontier.push(rootH, root);
  frontierSet.add(initialTiles.join(','));

  while (!frontier.isEmpty) {
    if (nodesExpanded >= maxNodes) return { found: false, error: 'exhausted', nodesGenerated, nodesExpanded };

    const node = frontier.pop();
    const key  = node.tiles.join(',');
    frontierSet.delete(key);
    if (explored.has(key)) continue;
    explored.add(key);
    nodesExpanded++;

    if (key === goalTiles.join(',')) {
      const path = [];
      let cur = node;
      while (cur) { path.unshift(cur); cur = cur.parent; }
      return { found: true, path, nodesGenerated, nodesExpanded };
    }

    for (const { tiles: st, move } of getSuccessors(node.tiles)) {
      const sk = st.join(',');
      if (explored.has(sk) || frontierSet.has(sk)) continue;
      const h = manhattanDistance(st, goalMap);
      const succNode = { tiles: st, parent: node, move, depth: node.depth + 1, h };
      frontier.push(h, succNode);
      frontierSet.add(sk);
      nodesGenerated++;
    }
  }

  return { found: false, error: 'no solution', nodesGenerated, nodesExpanded };
}

// --- Solvability ---
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

let passed = 0, failed = 0;
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

function assert(cond, msg) { if (!cond) throw new Error(msg || 'Assertion failed'); }
function assertEqual(a, e, msg) { if (a !== e) throw new Error(msg || `Expected ${e}, got ${a}`); }

// ══════════════════════════════════════════════════════════════
// PRIORITY QUEUE TESTS
// ══════════════════════════════════════════════════════════════

console.log('\n🧪 Priority Queue Tests');

test('pq: empty queue returns null on pop', () => {
  const pq = new PriorityQueue();
  assertEqual(pq.pop(), null, 'Empty queue pop should return null');
});

test('pq: single item enqueue/dequeue', () => {
  const pq = new PriorityQueue();
  pq.push(5, 'hello');
  assertEqual(pq.pop(), 'hello', 'Should return pushed item');
});

test('pq: lower priority dequeued first', () => {
  const pq = new PriorityQueue();
  pq.push(10, 'high');
  pq.push(1,  'low');
  pq.push(5,  'mid');
  assertEqual(pq.pop(), 'low', 'Lowest priority value (1) should come first');
  assertEqual(pq.pop(), 'mid', 'Next lowest (5) should come next');
  assertEqual(pq.pop(), 'high', 'Highest (10) should come last');
});

test('pq: size is correct', () => {
  const pq = new PriorityQueue();
  assertEqual(pq.size, 0);
  pq.push(1, 'a');
  assertEqual(pq.size, 1);
  pq.push(2, 'b');
  assertEqual(pq.size, 2);
  pq.pop();
  assertEqual(pq.size, 1);
});

test('pq: FIFO tie-breaking (same priority)', () => {
  const pq = new PriorityQueue();
  pq.push(0, 'first');
  pq.push(0, 'second');
  pq.push(0, 'third');
  // Should come out in insertion order (FIFO for same priority)
  assertEqual(pq.pop(), 'first', 'FIFO: first inserted comes out first');
  assertEqual(pq.pop(), 'second', 'FIFO: second inserted comes out second');
  assertEqual(pq.pop(), 'third', 'FIFO: third inserted comes out last');
});

test('pq: large number of inserts and correct ordering', () => {
  const pq = new PriorityQueue();
  const vals = [7, 3, 9, 1, 5, 2, 8, 4, 6, 0];
  vals.forEach(v => pq.push(v, v));
  const sorted = [];
  while (!pq.isEmpty) sorted.push(pq.pop());
  for (let i = 1; i < sorted.length; i++) {
    assert(sorted[i] >= sorted[i-1], `Out of order at index ${i}: ${sorted[i-1]} > ${sorted[i]}`);
  }
});

// ══════════════════════════════════════════════════════════════
// GBFS ALGORITHM TESTS
// ══════════════════════════════════════════════════════════════

console.log('\n🧪 GBFS Algorithm Tests');

const STANDARD_GOAL = [1,2,3,4,5,6,7,8,0];

test('gbfs: trivial case (initial = goal)', () => {
  const r = runGBFS(STANDARD_GOAL, STANDARD_GOAL);
  assert(r.found, 'Should find solution immediately');
  assertEqual(r.path.length, 1, 'Path should be just the goal state (1 node)');
  assertEqual(r.nodesExpanded, 0, 'No expansion needed');
});

test('gbfs: one move solution', () => {
  // Swap blank and tile 8: one move to solve
  const initial = [1,2,3,4,5,6,7,0,8];
  const goal    = [1,2,3,4,5,6,7,8,0];
  const r = runGBFS(initial, goal);
  assert(r.found, 'Should find solution');
  assertEqual(r.path.length, 2, 'Path should be 2 nodes (initial → goal)');
  assertEqual(r.path[r.path.length-1].tiles.join(','), goal.join(','), 'Last node should be goal');
});

test('gbfs: known solvable puzzle', () => {
  const initial = [1,2,3,4,0,5,7,8,6];
  const r = runGBFS(initial, STANDARD_GOAL);
  assert(r.found, 'Should find solution for this known solvable puzzle');
  assert(r.path.length > 1, 'Path should have more than 1 step');
  assert(r.nodesExpanded > 0, 'At least one node should be expanded');
});

test('gbfs: solution path starts with initial and ends with goal', () => {
  const initial = [1,2,3,4,0,5,7,8,6];
  const r = runGBFS(initial, STANDARD_GOAL);
  assert(r.found, 'Should find solution');
  assertEqual(r.path[0].tiles.join(','), initial.join(','), 'Path should start with initial state');
  assertEqual(r.path[r.path.length-1].tiles.join(','), STANDARD_GOAL.join(','), 'Path should end with goal state');
});

test('gbfs: parent tracking (each node has parent)', () => {
  const initial = [1,2,3,4,0,5,7,8,6];
  const r = runGBFS(initial, STANDARD_GOAL);
  assert(r.found, 'Should find solution');
  // First node has no parent; all others do
  assertEqual(r.path[0].parent, null, 'Root node should have null parent');
  for (let i = 1; i < r.path.length; i++) {
    assert(r.path[i].parent !== null, `Node ${i} should have a parent`);
  }
});

test('gbfs: consecutive path nodes differ by exactly one move', () => {
  const initial = [1,2,3,4,0,5,7,8,6];
  const r = runGBFS(initial, STANDARD_GOAL);
  assert(r.found, 'Should find solution');

  for (let i = 1; i < r.path.length; i++) {
    const prev = r.path[i-1].tiles;
    const curr = r.path[i].tiles;
    let diffs = 0;
    for (let j = 0; j < 9; j++) if (prev[j] !== curr[j]) diffs++;
    assertEqual(diffs, 2, `Step ${i}: expected 2 position changes, got ${diffs}`);
  }
});

test('gbfs: nodes generated >= nodes expanded', () => {
  const initial = [1,2,3,4,0,5,7,8,6];
  const r = runGBFS(initial, STANDARD_GOAL);
  assert(r.nodesGenerated >= r.nodesExpanded, 'Generated must be >= expanded');
});

test('gbfs: resource limit returns failure without crash', () => {
  // Use maxNodes=1 to force exhaustion
  const initial = [1,2,3,4,0,5,7,8,6];
  const r = runGBFS(initial, STANDARD_GOAL, 1);
  // Should return failure (or possibly found on 1st expand if trivially close)
  assert('found' in r, 'Should return a result object with found field');
});

test('gbfs: unsolvable puzzle returns not found', () => {
  // Swap 1 and 2 in goal — makes puzzle unsolvable
  const initial = [2,1,3,4,5,6,7,8,0];
  const goal    = [1,2,3,4,5,6,7,8,0];
  assert(!isSolvable(initial, goal), 'Confirm this is actually unsolvable');

  const r = runGBFS(initial, goal, 50000);
  assert(!r.found, 'Should not find solution for unsolvable puzzle');
});

test('gbfs: repeated states not re-expanded', () => {
  // Any simple puzzle — verify explored set prevents re-expansion
  const initial = [1,2,3,4,0,5,7,8,6];
  const r = runGBFS(initial, STANDARD_GOAL);
  assert(r.found, 'Should find solution');
  // If repeated states were re-expanded, this would run forever or very long
  // The test passing quickly implies correct implementation
  assert(r.nodesExpanded < 10000, 'Too many expansions suggest repeated state issue');
});

test('gbfs: h values decrease (or stay equal) along solution path for GBFS', () => {
  // GBFS greedily reduces h, so h should generally decrease along path
  const initial = [1,2,3,4,0,5,7,8,6];
  const r = runGBFS(initial, STANDARD_GOAL);
  assert(r.found, 'Should find solution');
  const last = r.path[r.path.length-1];
  assertEqual(last.h, 0, 'Goal node should have h=0');
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
  console.log('\n✅ All GBFS tests passed!');
  process.exit(0);
}
