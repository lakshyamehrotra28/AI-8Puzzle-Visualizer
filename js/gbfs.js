/**
 * gbfs.js — Greedy Best-First Search Implementation
 * AI-8Puzzle-Visualizer | Student: 24BCI0212
 *
 * ─────────────────────────────────────────────────────────────
 * GREEDY BEST-FIRST SEARCH (GBFS)
 * ─────────────────────────────────────────────────────────────
 *
 * GBFS selects the next node to expand based SOLELY on the
 * heuristic function h(n), which estimates the cost from the
 * current node to the goal.
 *
 *   Evaluation function: f(n) = h(n)
 *
 * KEY DISTINCTION FROM A*:
 *   A* uses:     f(n) = g(n) + h(n)   (path cost + heuristic)
 *   GBFS uses:   f(n) = h(n)           (heuristic ONLY, no g(n))
 *
 * Because GBFS ignores g(n), it:
 *   - Is NOT generally optimal (may find suboptimal solutions)
 *   - Is NOT complete in infinite search spaces
 *   - Is faster in practice when the heuristic is informative
 *   - Behaves greedily: always expands the node that appears
 *     closest to the goal according to h(n)
 *
 * Algorithm:
 *   1. Initialize frontier (open list) with start node, ordered by h(n)
 *   2. Initialize explored set (closed list) as empty
 *   3. Loop:
 *      a. If frontier is empty → FAILURE (no solution)
 *      b. Pop node with lowest h(n) from frontier
 *      c. If node is goal → SUCCESS (reconstruct path)
 *      d. Add node to explored set
 *      e. For each successor of node:
 *         - If successor not in explored AND not in frontier → add to frontier
 *         - If successor in frontier with higher h → replace (optional, GBFS typically doesn't)
 *
 * This implementation:
 *   - Uses a min-heap priority queue ordered by h(n)
 *   - Uses deterministic tie-breaking (by insertion order / state key)
 *   - Tracks parent nodes for path reconstruction
 *   - Prevents re-expansion of explored nodes
 *   - Records complete search history for step-by-step visualization
 *   - Is fully independent of DOM manipulation
 *
 * ─────────────────────────────────────────────────────────────
 */

'use strict';

import { PuzzleBoard, BLANK_TILE } from './puzzle.js';
import { computeHeuristic, HEURISTIC, buildGoalPositionMap } from './heuristics.js';

// ── Configuration ──────────────────────────────────────────
const DEFAULT_CONFIG = {
  maxNodes:        100000,  // Prevent runaway search
  maxDepth:        500,     // Maximum search depth
  heuristic:       HEURISTIC.MANHATTAN,
};

// ── Priority Queue (Min-Heap) ──────────────────────────────

/**
 * MinHeap Priority Queue ordered by a numeric priority value.
 * Used to implement GBFS frontier (open list).
 *
 * Each entry: { priority: number, tieBreak: number, data: any }
 *
 * Tie-breaking uses insertion sequence (FIFO) for determinism.
 */
export class PriorityQueue {
  constructor() {
    this._heap    = [];  // Internal heap array
    this._counter = 0;   // Tie-breaking counter (monotonically increasing)
  }

  /** Number of items in the queue */
  get size() {
    return this._heap.length;
  }

  /** True if queue is empty */
  get isEmpty() {
    return this._heap.length === 0;
  }

  /**
   * Insert an item with the given priority.
   * @param {number} priority - Lower values are dequeued first
   * @param {*}      data     - Payload
   */
  push(priority, data) {
    const entry = { priority, tieBreak: this._counter++, data };
    this._heap.push(entry);
    this._bubbleUp(this._heap.length - 1);
  }

  /**
   * Remove and return the item with the lowest priority.
   * @returns {*} data
   */
  pop() {
    if (this.isEmpty) return null;

    const top  = this._heap[0];
    const last = this._heap.pop();

    if (this._heap.length > 0) {
      this._heap[0] = last;
      this._sinkDown(0);
    }

    return top.data;
  }

  /**
   * Peek at the item with lowest priority without removing it.
   * @returns {*} data
   */
  peek() {
    if (this.isEmpty) return null;
    return this._heap[0].data;
  }

  /** Return all data items (for inspection) — does NOT modify heap */
  toArray() {
    return this._heap.map(e => e.data);
  }

  /** Clear all items */
  clear() {
    this._heap    = [];
    this._counter = 0;
  }

  // ── Internal Heap Helpers ───────────────────────────────

  _compare(a, b) {
    // Primary: lower priority first
    if (a.priority !== b.priority) return a.priority - b.priority;
    // Tie-break: lower insertion index first (FIFO)
    return a.tieBreak - b.tieBreak;
  }

  _bubbleUp(idx) {
    while (idx > 0) {
      const parent = Math.floor((idx - 1) / 2);
      if (this._compare(this._heap[idx], this._heap[parent]) < 0) {
        [this._heap[idx], this._heap[parent]] = [this._heap[parent], this._heap[idx]];
        idx = parent;
      } else {
        break;
      }
    }
  }

  _sinkDown(idx) {
    const n = this._heap.length;
    while (true) {
      let smallest = idx;
      const left   = 2 * idx + 1;
      const right  = 2 * idx + 2;

      if (left  < n && this._compare(this._heap[left],  this._heap[smallest]) < 0) smallest = left;
      if (right < n && this._compare(this._heap[right], this._heap[smallest]) < 0) smallest = right;

      if (smallest !== idx) {
        [this._heap[idx], this._heap[smallest]] = [this._heap[smallest], this._heap[idx]];
        idx = smallest;
      } else {
        break;
      }
    }
  }
}

// ── Search Node ────────────────────────────────────────────

/**
 * Represents a single node in the GBFS search tree.
 */
export class SearchNode {
  /**
   * @param {PuzzleBoard} board       - Current board state
   * @param {SearchNode|null} parent  - Parent node (null for root)
   * @param {string} move             - Move that generated this node ('START','UP','DOWN','LEFT','RIGHT')
   * @param {number} depth            - Depth of this node from root
   * @param {number} hValue           - h(n): heuristic estimate to goal
   */
  constructor(board, parent, move, depth, hValue) {
    this.board   = board;
    this.parent  = parent;
    this.move    = move;
    this.depth   = depth;
    this.hValue  = hValue;
    // GBFS evaluation function: f(n) = h(n) (no g(n) term)
    this.fValue  = hValue;
    // Path cost g(n) is tracked but NOT used for ordering in GBFS
    this.gValue  = depth;  // In 8-puzzle, depth = path cost (unit cost per move)
    this.id      = board.toKey();
  }
}

// ── GBFS Search Function ───────────────────────────────────

/**
 * Run Greedy Best-First Search from initial to goal state.
 *
 * @param {number[]} initialTiles - Initial board state (array of 9 ints)
 * @param {number[]} goalTiles    - Goal board state (array of 9 ints)
 * @param {object}   options      - Configuration options
 * @param {string}   options.heuristic  - Heuristic ID ('misplaced'|'manhattan')
 * @param {number}   options.maxNodes   - Max nodes to expand before giving up
 * @param {number}   options.maxDepth   - Max depth to explore
 *
 * @returns {GBFSResult}
 */
export function runGBFS(initialTiles, goalTiles, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };

  const startTime = performance.now();

  // ── Validate inputs ──────────────────────────────────────
  if (!initialTiles || !goalTiles) {
    return buildFailureResult('Invalid puzzle input: tiles arrays are null or undefined.', startTime);
  }

  const initialBoard = new PuzzleBoard(initialTiles);
  const goalBoard    = new PuzzleBoard(goalTiles);

  // Pre-build goal position map for fast Manhattan distance lookup
  const goalMap = buildGoalPositionMap(goalTiles);

  // ── Check trivial case: already at goal ─────────────────
  if (initialBoard.isGoal(goalBoard)) {
    const rootNode = new SearchNode(initialBoard, null, 'START', 0, 0);
    return buildSuccessResult([rootNode], [], [], 0, 0, 0, startTime, config.heuristic);
  }

  // ── Initialize root node ─────────────────────────────────
  const rootHValue = computeHeuristic(config.heuristic, initialTiles, goalTiles, goalMap);
  const rootNode   = new SearchNode(initialBoard, null, 'START', 0, rootHValue);

  // ── Frontier (Open List): min-heap ordered by h(n) ──────
  const frontier = new PriorityQueue();
  frontier.push(rootHValue, rootNode);

  // ── Frontier lookup: stateKey → true (for membership check) ──
  const frontierSet = new Set([rootNode.id]);

  // ── Explored (Closed List): stateKey → true ─────────────
  const exploredSet = new Set();

  // ── Search History for step-by-step visualization ───────
  const history = [];

  // ── Statistics ───────────────────────────────────────────
  let nodesGenerated = 1;  // Count root node
  let nodesExpanded  = 0;
  let maxDepthReached= 0;

  // ── Main Search Loop ─────────────────────────────────────
  while (!frontier.isEmpty) {

    // Safety limit
    if (nodesExpanded >= config.maxNodes) {
      return buildFailureResult(
        `Search exhausted: expanded ${nodesExpanded} nodes without finding a solution. ` +
        `The puzzle may be unsolvable or the limit (${config.maxNodes} nodes) was reached.`,
        startTime, nodesGenerated, nodesExpanded, maxDepthReached
      );
    }

    // Pop node with lowest h(n) from frontier
    const currentNode = frontier.pop();
    frontierSet.delete(currentNode.id);

    // Skip if already explored (can happen if duplicate states were queued)
    if (exploredSet.has(currentNode.id)) continue;

    // Record this expansion step
    const stepSnapshot = {
      type:              'expand',
      node:              currentNode,
      boardState:        [...currentNode.board.tiles],
      hValue:            currentNode.hValue,
      fValue:            currentNode.fValue,
      gValue:            currentNode.gValue,
      depth:             currentNode.depth,
      move:              currentNode.move,
      nodesGenerated,
      nodesExpanded:     nodesExpanded + 1,
      frontierSize:      frontier.size,
      exploredSize:      exploredSet.size + 1,
      frontierSnapshot:  frontier.toArray().slice(0, 20).map(n => ({
        state: [...n.board.tiles], h: n.hValue
      })),
    };

    nodesExpanded++;
    maxDepthReached = Math.max(maxDepthReached, currentNode.depth);

    // ── Goal Test ──────────────────────────────────────────
    if (currentNode.board.isGoal(goalBoard)) {
      const solutionPath = reconstructPath(currentNode);
      stepSnapshot.type = 'goal';
      history.push(stepSnapshot);

      const elapsed = performance.now() - startTime;
      return {
        found:          true,
        solutionPath,
        solutionMoves:  solutionPath.length - 1,
        history,
        nodesGenerated,
        nodesExpanded,
        maxDepth:       maxDepthReached,
        executionTime:  elapsed,
        heuristic:      config.heuristic,
        message:        `Solution found in ${solutionPath.length - 1} moves.`,
        memoryEstimate: estimateMemory(nodesGenerated),
        error:          null,
      };
    }

    // ── Mark as explored ────────────────────────────────────
    exploredSet.add(currentNode.id);
    history.push(stepSnapshot);

    // Depth limit check
    if (currentNode.depth >= config.maxDepth) continue;

    // ── Expand Successors ────────────────────────────────────
    const successors = currentNode.board.getSuccessors();

    for (const { board: succBoard, move, movedTile } of successors) {
      const succKey = succBoard.toKey();

      // Skip if already explored
      if (exploredSet.has(succKey)) continue;

      // Skip if already in frontier (GBFS: simple membership check)
      if (frontierSet.has(succKey)) continue;

      const hVal = computeHeuristic(config.heuristic, succBoard.tiles, goalTiles, goalMap);
      const succNode = new SearchNode(
        succBoard,
        currentNode,
        move,
        currentNode.depth + 1,
        hVal
      );

      frontier.push(hVal, succNode);
      frontierSet.add(succKey);
      nodesGenerated++;

      // Record generation event
      history.push({
        type:         'generate',
        node:         succNode,
        boardState:   [...succBoard.tiles],
        parentState:  [...currentNode.board.tiles],
        move,
        movedTile,
        hValue:       hVal,
        fValue:       hVal,
        depth:        succNode.depth,
        nodesGenerated,
        nodesExpanded,
      });
    }
  }

  // ── Frontier exhausted: no solution ─────────────────────
  return buildFailureResult(
    'No solution exists for this puzzle configuration (frontier exhausted).',
    startTime, nodesGenerated, nodesExpanded, maxDepthReached
  );
}

// ── Path Reconstruction ────────────────────────────────────

/**
 * Reconstruct the solution path from goal node back to root.
 * @param {SearchNode} goalNode
 * @returns {SearchNode[]} - Path from root to goal (inclusive)
 */
export function reconstructPath(goalNode) {
  const path = [];
  let current = goalNode;

  while (current !== null) {
    path.unshift(current);
    current = current.parent;
  }

  return path;
}

// ── Result Builders ────────────────────────────────────────

function buildSuccessResult(path, history, frontier, nodesGenerated, nodesExpanded, maxDepth, startTime, heuristic) {
  return {
    found:          true,
    solutionPath:   path,
    solutionMoves:  path.length - 1,
    history:        history,
    nodesGenerated,
    nodesExpanded,
    maxDepth,
    executionTime:  performance.now() - startTime,
    heuristic,
    message:        path.length === 1 ? 'Initial state is already the goal!' : `Solution found in ${path.length - 1} moves.`,
    memoryEstimate: estimateMemory(nodesGenerated),
    error:          null,
  };
}

function buildFailureResult(message, startTime, nodesGenerated = 0, nodesExpanded = 0, maxDepth = 0) {
  return {
    found:          false,
    solutionPath:   [],
    solutionMoves:  0,
    history:        [],
    nodesGenerated,
    nodesExpanded,
    maxDepth,
    executionTime:  performance.now() - startTime,
    heuristic:      null,
    message,
    memoryEstimate: estimateMemory(nodesGenerated),
    error:          message,
  };
}

// ── Memory Estimation ──────────────────────────────────────

/**
 * Estimate approximate memory usage (in KB).
 * Each node stores roughly 9 ints (tiles) + parent ref + metadata ≈ ~300 bytes.
 * @param {number} nodeCount
 * @returns {string}
 */
export function estimateMemory(nodeCount) {
  const bytesPerNode = 300;
  const totalBytes   = nodeCount * bytesPerNode;

  if (totalBytes < 1024) return `${totalBytes} B`;
  if (totalBytes < 1024 * 1024) return `${(totalBytes / 1024).toFixed(1)} KB`;
  return `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ── Theoretical Properties ─────────────────────────────────

/**
 * Return the theoretical properties of GBFS for display.
 */
export function getGBFSProperties() {
  return {
    name:           'Greedy Best-First Search',
    abbreviation:   'GBFS',
    evaluationFn:   'f(n) = h(n)',
    timeComplexity: 'O(b^m) worst case, much better with good heuristic',
    spaceComplexity:'O(b^m) — stores entire frontier',
    complete:       false,
    optimal:        false,
    completenessNote: 'Not complete in infinite spaces; complete in finite spaces with repeated-state checking.',
    optimalityNote:   'Not optimal. GBFS may find a longer path because it ignores g(n).',
    description:    'GBFS expands the node that appears closest to the goal according to h(n). It is typically faster than BFS/DFS but sacrifices completeness and optimality.',
    vsAStar: {
      GBFS: 'f(n) = h(n) — ignores path cost g(n), greedy, fast but not optimal',
      AStar: 'f(n) = g(n) + h(n) — balances path cost and heuristic, complete and optimal with admissible h',
    },
  };
}

export default {
  runGBFS,
  PriorityQueue,
  SearchNode,
  reconstructPath,
  estimateMemory,
  getGBFSProperties,
};
