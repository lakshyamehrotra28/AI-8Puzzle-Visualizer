/**
 * priority-queue.test.js — Dedicated Unit Tests for Min-Heap Priority Queue
 * AI-8Puzzle-Visualizer | Student: 24BCI0212
 *
 * Verifies Min-Heap property, FIFO tie-breaking, boundary handling,
 * and high-volume stress testing for GBFS frontier management.
 *
 * Run with: node tests/priority-queue.test.js
 */

'use strict';

class PriorityQueue {
  constructor() {
    this._heap = [];
    this._counter = 0;
  }

  get size() {
    return this._heap.length;
  }

  get isEmpty() {
    return this._heap.length === 0;
  }

  push(priority, data) {
    const entry = { priority, tieBreak: this._counter++, data };
    this._heap.push(entry);
    this._bubbleUp(this._heap.length - 1);
  }

  pop() {
    if (this.isEmpty) return null;
    const top = this._heap[0];
    const last = this._heap.pop();
    if (this._heap.length > 0) {
      this._heap[0] = last;
      this._sinkDown(0);
    }
    return top.data;
  }

  peek() {
    if (this.isEmpty) return null;
    return this._heap[0].data;
  }

  toArray() {
    return this._heap.map(e => e.data);
  }

  clear() {
    this._heap = [];
    this._counter = 0;
  }

  _compare(a, b) {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.tieBreak - b.tieBreak;
  }

  _bubbleUp(idx) {
    const entry = this._heap[idx];
    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);
      const parent = this._heap[parentIdx];
      if (this._compare(entry, parent) < 0) {
        this._heap[idx] = parent;
        idx = parentIdx;
      } else {
        break;
      }
    }
    this._heap[idx] = entry;
  }

  _sinkDown(idx) {
    const length = this._heap.length;
    const entry = this._heap[idx];
    while (true) {
      const leftIdx = 2 * idx + 1;
      const rightIdx = 2 * idx + 2;
      let swapIdx = null;

      if (leftIdx < length) {
        if (this._compare(this._heap[leftIdx], entry) < 0) {
          swapIdx = leftIdx;
        }
      }

      if (rightIdx < length) {
        const compareTarget = swapIdx === null ? entry : this._heap[leftIdx];
        if (this._compare(this._heap[rightIdx], compareTarget) < 0) {
          swapIdx = rightIdx;
        }
      }

      if (swapIdx === null) break;
      this._heap[idx] = this._heap[swapIdx];
      idx = swapIdx;
    }
    this._heap[idx] = entry;
  }
}

// ── Test Runner ──────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('\n🧪 Priority Queue (Min-Heap) Unit Tests');

// Test 1: Empty queue initial state
const pq1 = new PriorityQueue();
assert(pq1.isEmpty === true, 'new queue is empty');
assert(pq1.size === 0, 'new queue size is 0');
assert(pq1.pop() === null, 'pop on empty queue returns null');
assert(pq1.peek() === null, 'peek on empty queue returns null');

// Test 2: Single element push and pop
pq1.push(5, 'first');
assert(pq1.isEmpty === false, 'queue not empty after push');
assert(pq1.size === 1, 'queue size is 1');
assert(pq1.peek() === 'first', 'peek returns correct item without removing');
assert(pq1.size === 1, 'peek does not decrement size');
assert(pq1.pop() === 'first', 'pop returns correct item');
assert(pq1.isEmpty === true, 'queue empty after pop');

// Test 3: Min-Heap ordering with inverted inputs
const pq2 = new PriorityQueue();
pq2.push(10, 'ten');
pq2.push(4, 'four');
pq2.push(7, 'seven');
pq2.push(1, 'one');
pq2.push(8, 'eight');
pq2.push(2, 'two');

assert(pq2.size === 6, 'size is 6 after 6 insertions');
assert(pq2.pop() === 'one', 'min element 1 dequeued first');
assert(pq2.pop() === 'two', 'element 2 dequeued second');
assert(pq2.pop() === 'four', 'element 4 dequeued third');
assert(pq2.pop() === 'seven', 'element 7 dequeued fourth');
assert(pq2.pop() === 'eight', 'element 8 dequeued fifth');
assert(pq2.pop() === 'ten', 'element 10 dequeued last');
assert(pq2.isEmpty === true, 'queue is now empty');

// Test 4: Deterministic FIFO tie-breaking on identical priorities
const pq3 = new PriorityQueue();
pq3.push(3, 'alpha');
pq3.push(3, 'beta');
pq3.push(3, 'gamma');
pq3.push(1, 'first-p1');

assert(pq3.pop() === 'first-p1', 'lower priority dequeued before tie items');
assert(pq3.pop() === 'alpha', 'first inserted item at priority 3 dequeued first');
assert(pq3.pop() === 'beta', 'second inserted item at priority 3 dequeued second');
assert(pq3.pop() === 'gamma', 'third inserted item at priority 3 dequeued third');

// Test 5: Negative and floating-point priorities
const pq4 = new PriorityQueue();
pq4.push(-5, 'neg5');
pq4.push(2.5, 'two-point-five');
pq4.push(-10, 'neg10');
pq4.push(0, 'zero');
pq4.push(2.1, 'two-point-one');

assert(pq4.pop() === 'neg10', 'handles most negative priority');
assert(pq4.pop() === 'neg5', 'handles negative priority');
assert(pq4.pop() === 'zero', 'handles zero priority');
assert(pq4.pop() === 'two-point-one', 'handles floating point order (2.1 < 2.5)');
assert(pq4.pop() === 'two-point-five', 'handles floating point order (2.5)');

// Test 6: Clear method
const pq5 = new PriorityQueue();
pq5.push(1, 'a');
pq5.push(2, 'b');
pq5.clear();
assert(pq5.isEmpty === true, 'clear empties the queue');
assert(pq5.size === 0, 'size reset to 0');
assert(pq5.pop() === null, 'pop returns null after clear');

// Test 7: toArray does not mutate heap
const pq6 = new PriorityQueue();
pq6.push(3, 'x');
pq6.push(1, 'y');
const arr = pq6.toArray();
assert(arr.length === 2, 'toArray returns all elements');
assert(pq6.size === 2, 'toArray does not modify queue size');

// Test 8: High-volume stress test with 500 random priorities
const pqStress = new PriorityQueue();
const count = 500;
const expectedSorted = [];

for (let i = 0; i < count; i++) {
  const p = Math.floor(Math.random() * 10000);
  pqStress.push(p, p);
  expectedSorted.push(p);
}
expectedSorted.sort((a, b) => a - b);

let sortedCorrectly = true;
for (let i = 0; i < count; i++) {
  const popped = pqStress.pop();
  if (popped !== expectedSorted[i]) {
    sortedCorrectly = false;
    break;
  }
}
assert(sortedCorrectly, `all ${count} elements popped in strictly ascending sorted order`);

console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
