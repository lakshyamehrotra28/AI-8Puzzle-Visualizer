# Algorithm Explanation — AI-8Puzzle-Visualizer
**Student:** 24BCI0212 | **Course:** Artificial Intelligence | **Algorithm:** Greedy Best-First Search (GBFS)

---

## 1. The 8-Puzzle Problem

### Problem Formulation

The 8-Puzzle is a **state-space search problem** consisting of a 3×3 grid with eight numbered tiles (1–8) and one blank tile (represented by 0). The objective is to slide tiles from an **initial state** to a predefined **goal state**.

**Formal Definition:**
- **State:** A configuration of 9 cells: an array of 9 integers (0–8), where 0 = blank
- **Initial State:** Any valid permutation of 0–8
- **Goal State:** A target configuration (typically `[1,2,3,4,5,6,7,8,0]`)
- **Actions:** Slide the blank tile UP, DOWN, LEFT, or RIGHT (boundary-constrained)
- **Transition Model:** `result(state, action) → new state`
- **Path Cost:** Each move costs 1 unit
- **Goal Test:** `current_state == goal_state`

**State Space Size:** 9! = 362,880 total permutations. Exactly half (181,440) are reachable from any given state.

---

## 2. Greedy Best-First Search (GBFS)

### 2.1 Overview

Greedy Best-First Search (GBFS) is a **heuristic search algorithm** that selects the next node to expand based solely on the heuristic function h(n).

**Evaluation Function:**
```
f(n) = h(n)
```

Where:
- `h(n)` = estimated cost from node `n` to the goal (heuristic)
- There is **no g(n) term** (path cost is ignored)

### 2.2 Key Distinction from A*

| Property | GBFS | A* |
|----------|------|----|
| Evaluation Function | `f(n) = h(n)` | `f(n) = g(n) + h(n)` |
| Uses Path Cost | ❌ No | ✅ Yes |
| Optimal | ❌ No | ✅ Yes (with admissible h) |
| Complete | ❌ No (infinite spaces) | ✅ Yes (admissible h) |
| Typical Speed | Faster | Slower |
| Memory | O(b^m) | O(b^d) |

**Why this distinction matters:** Because GBFS ignores `g(n)`, it may find a suboptimal path. It greedily moves toward states that appear closer to the goal according to the heuristic, without considering how much work has already been done.

### 2.3 Algorithm

```
function GBFS(initial, goal, heuristic):
    frontier = PriorityQueue()           // Ordered by h(n) — min-heap
    frontier.push(h(initial, goal), initial)
    explored = Set()                     // Closed list
    
    while frontier is not empty:
        node = frontier.pop()            // Expand node with lowest h(n)
        
        if node is goal:
            return reconstruct_path(node)
        
        if node in explored:
            continue                     // Skip already-expanded states
        
        explored.add(node)
        
        for each successor in expand(node):
            if successor not in explored AND successor not in frontier:
                h_val = h(successor, goal)
                successor.f = h_val      // f(n) = h(n) ONLY
                frontier.push(h_val, successor)
    
    return FAILURE                       // No solution found
```

### 2.4 Properties

| Property | Value | Explanation |
|----------|-------|-------------|
| **Complete** | No (in general) | Can fail in infinite spaces; complete in finite spaces with closed list |
| **Optimal** | No | Ignores g(n), may find longer paths |
| **Time Complexity** | O(b^m) worst case | b = branching factor (≤4), m = max depth |
| **Space Complexity** | O(b^m) | Stores entire frontier |
| **Heuristic Sensitivity** | High | Performance heavily depends on heuristic quality |

### 2.5 Priority Queue Implementation

The frontier is implemented as a **binary min-heap**:
- **Push (insert):** O(log n)
- **Pop (extract-min):** O(log n)
- **Peek (view min):** O(1)
- **Tie-breaking:** FIFO (by insertion sequence) for deterministic behavior

### 2.6 Why GBFS Is Not Optimal

Consider this example where GBFS follows a greedy path but A* would find a shorter one:

```
State A (h=3) → State B (h=2) → State C (h=1) → Goal (h=0)  [length 3]
State A (h=3) → State D (h=1) → Goal (h=0)                   [length 2]
```

GBFS might first expand A→B→C→Goal (3 moves) when A→D→Goal (2 moves) is shorter, if h(D)>h(B) initially.

---

## 3. Heuristic Functions

### 3.1 Misplaced Tiles — h₁(n)

**Mathematical Definition:**
```
h₁(n) = Σ [tile_i ≠ goal_i AND tile_i ≠ 0]  for i = 0..8
```

Counts the number of non-blank tiles not in their goal position.

**Properties:**
- **Admissible:** Yes — each misplaced tile requires at least one move, so h₁ never overestimates
- **Consistent:** Yes — satisfies triangle inequality h(n) ≤ c(n,n') + h(n')
- **Lower bound:** h₁(n) ≤ h*(n)

**Example:**
```
Current: [1,2,3,4,0,5,7,8,6]    Goal: [1,2,3,4,5,6,7,8,0]
         ┌─────────────────┐           ┌─────────────────┐
         │ 1  2  3 │                   │ 1  2  3 │
         │ 4  _  5 │                   │ 4  5  6 │
         │ 7  8  6 │                   │ 7  8  _ │
         └─────────────────┘           └─────────────────┘

Tile 5: at (1,2), goal (1,1) → misplaced ✗
Tile 6: at (2,2), goal (1,2) → misplaced ✗
Tile 8: at (2,1), goal (2,1) → in place  ✓
Tile 7: at (2,0), goal (2,0) → in place  ✓

h₁ = 2 (tiles 5 and 6 are misplaced)
```

### 3.2 Manhattan Distance — h₂(n)

**Mathematical Definition:**
```
h₂(n) = Σ ( |currentRow(t) - goalRow(t)| + |currentCol(t) - goalCol(t)| )
         for each tile t where t ≠ 0
```

Sums the Manhattan (L1) distances each tile must travel.

**Properties:**
- **Admissible:** Yes — tiles can only move horizontally/vertically, so h₂ cannot overestimate
- **Consistent:** Yes
- **Dominates h₁:** h₂(n) ≥ h₁(n) for all states n — h₂ is more informed

**Example:**
```
Current: [1,2,3,4,0,5,7,8,6]    Goal: [1,2,3,4,5,6,7,8,0]

Tile 1: pos (0,0) → goal (0,0): |0-0|+|0-0| = 0
Tile 2: pos (0,1) → goal (0,1): |0-0|+|1-1| = 0
Tile 3: pos (0,2) → goal (0,2): |0-0|+|2-2| = 0
Tile 4: pos (1,0) → goal (1,0): |1-1|+|0-0| = 0
Tile 5: pos (1,2) → goal (1,1): |1-1|+|2-1| = 1  ← moved 1 right
Tile 7: pos (2,0) → goal (2,0): |2-2|+|0-0| = 0
Tile 8: pos (2,1) → goal (2,1): |2-2|+|1-1| = 0
Tile 6: pos (2,2) → goal (1,2): |2-1|+|2-2| = 1  ← moved 1 down

h₂ = 0+0+0+0+1+0+0+1 = 2
```

### 3.3 Dominance Relationship

h₂ **dominates** h₁ (Russell & Norvig, 2020):

```
h₂(n) ≥ h₁(n)  for all states n
```

**Proof sketch:** Every misplaced tile contributes 1 to h₁. Each such tile is at distance ≥ 1 from its goal, so contributes ≥ 1 to h₂. Thus h₂ ≥ h₁.

**Effect:** Using h₂ instead of h₁ causes GBFS to expand fewer nodes in practice, because a more informed heuristic guides the search more precisely toward the goal.

---

## 4. Solvability Analysis

### 4.1 Inversion Definition

An **inversion** is a pair of tiles (a, b) such that a appears before b in the row-major (left-to-right, top-to-bottom) tile ordering, and a > b (blank excluded).

**Inversion Count Formula:**
```
inversions(tiles) = |{(i,j) : i < j AND tiles[i] > tiles[j] AND tiles[j] ≠ 0 AND tiles[i] ≠ 0}|
```

### 4.2 Solvability Condition (3×3 Grids)

A configuration `initial` is solvable relative to `goal` if and only if:
```
inversions(initial) mod 2 == inversions(goal) mod 2
```

That is, they have the **same inversion parity**.

**Standard goal ([1,2,3,4,5,6,7,8,0]) has 0 inversions (even parity).**

So an initial state with the standard goal is solvable iff its inversion count is even.

---

## 5. Search Termination Conditions

The GBFS implementation handles:

| Condition | Handling |
|-----------|----------|
| Initial = Goal | Returns immediately with path of length 1 |
| Solution found | Returns path via parent pointers |
| Frontier empty | Returns FAILURE (no solution exists) |
| Node limit reached | Returns FAILURE with count |
| Depth limit reached | Prunes exploration beyond maxDepth |
| Invalid input | Returns error before search begins |
| Unsolvable puzzle | Detected by parity check before running |

---

## 6. Complexity Analysis for 8-Puzzle

| Algorithm | Time | Space | Complete | Optimal |
|-----------|------|-------|----------|---------|
| BFS | O(b^d) | O(b^d) | ✅ Yes | ✅ Yes (unit cost) |
| DFS | O(b^m) | O(bm) | ❌ No | ❌ No |
| DLS | O(b^l) | O(bl) | ❌ (if d>l) | ❌ No |
| IDDFS | O(b^d) | O(bd) | ✅ Yes | ✅ Yes |
| **GBFS** | **O(b^m)** | **O(b^m)** | **❌ No** | **❌ No** |
| A* | O(b^d) | O(b^d) | ✅ Yes | ✅ Yes |

Where:
- `b` = branching factor (at most 4 for 8-puzzle)
- `d` = solution depth
- `m` = maximum search depth
- `l` = depth limit (DLS parameter)

For the 8-Puzzle with Manhattan Distance, GBFS typically expands far fewer nodes than BFS because the heuristic is highly informative, even though worst-case complexity is the same.

---

## References

1. Russell, S. J., & Norvig, P. (2020). *Artificial Intelligence: A Modern Approach* (4th ed.). Pearson.
2. Hart, P. E., Nilsson, N. J., & Raphael, B. (1968). A formal basis for the heuristic determination of minimum cost paths. *IEEE Transactions on Systems Science and Cybernetics*, 4(2), 100-107.
3. Pohl, I. (1970). First results on the effect of error in heuristic search. *Machine Intelligence*, 5, 219-236.


### Formal State Space Definition
A state space graph G = (V, E) where vertices V are valid permutations of 0..8 and directed edges E represent valid transitions under blank sliding actions.


### State Space Diameter
Reinefeld (1993) proved through exhaustive search that the maximum distance between any two reachable states in the 8-puzzle is exactly 31 moves (God Number for 8-puzzle).


### Admissibility Proof for Manhattan Distance
Since each slide move changes either the row or column of a tile by at most 1, each tile t requires at least |r(t) - r_goal(t)| + |c(t) - c_goal(t)| moves to reach its goal position. Since no move can move two tiles closer simultaneously, h2(n) <= h*(n).


### Admissibility Proof for Misplaced Tiles
Each misplaced tile t (where tile_t != goal_t and t != 0) is not in its goal cell and must be moved at least once. Since a single move moves exactly one numbered tile, h1(n) <= h*(n).


### Heuristic Dominance Proof
For any non-blank tile t that is misplaced, its distance |r - r_goal| + |c - c_goal| >= 1. Summing over all misplaced tiles gives h2(n) >= h1(n). Hence h2 dominates h1.


### Consistency (Monotonicity) Proof
A heuristic h is consistent if h(n) <= c(n, a, n') + h(n'). In the 8-puzzle, c(n, a, n') = 1. A single tile move changes Manhattan distance by +1, -1, or 0. Thus |h2(n) - h2(n')| <= 1 = c(n, a, n').


#### Viva Q1: What is the total size of the 8-puzzle state space?
Answer: 9! = 362,880 total configurations, partitioned into two disjoint equivalence classes of 181,440 states each.


#### Viva Q2: Why is Greedy Best-First Search not guaranteed to find an optimal solution?
Answer: GBFS evaluates states using f(n) = h(n) and ignores path cost g(n). It can greedily chase a state with low heuristic value even if the path taken to reach it is long or circuitous.


#### Viva Q3: Under what conditions can GBFS fail to terminate in infinite spaces?
Answer: Without repeated-state checking, GBFS can enter infinite loops or follow an infinite dead-end path with misleadingly low heuristic estimates.


#### Viva Q4: How does GBFS differ mathematically from A* Search?
Answer: A* uses f(n) = g(n) + h(n), balancing cost accumulated with cost remaining. GBFS uses f(n) = h(n) solely.


#### Viva Q5: How does tie-breaking affect GBFS performance?
Answer: When multiple frontier nodes share the same h(n), tie-breaking decides expansion order. FIFO ensures deterministic reproducibility.


#### Viva Q6: Why is the blank tile excluded from heuristic calculations?
Answer: The blank tile does not represent a physical tile to be moved; moving any tile implicitly moves the blank. Counting the blank would double-count moves and violate admissibility.


#### Viva Q7: What is the Effective Branching Factor b*?
Answer: b* is the branching factor of a uniform tree of depth d containing N nodes, satisfying N = sum_{i=0}^d (b*)^i.


#### Viva Q8: What metric space does Manhattan Distance correspond to?
Answer: It is the L1 norm (taxicab or rectilinear distance) on the discrete 2D integer lattice Z^2.


#### Viva Q9: How is solvability determined in polynomial time without graph traversal?
Answer: By computing the inversion parity of the tile sequence. Solvable if and only if initial and goal parities match.


#### Viva Q10: What is the space complexity of GBFS and why is it problematic?
Answer: O(b^m). GBFS keeps all generated nodes in the frontier/explored set, which can exhaust RAM on deep searches.


### Graph-Theoretic State Space Formulation
Let G = (V, E) be an undirected graph where V is the set of 181,440 reachable board states and E is the set of valid tile slide transitions.


### God's Number for 8-Puzzle
Exhaustive breadth-first verification by Reinefeld (1993) demonstrated that no reachable 8-puzzle configuration requires more than 31 moves to solve.


### Admissibility Proof for h1(n)
Every misplaced tile must be moved at least once. Since a single move displaces exactly one numbered tile, h1(n) <= h*(n).


### Admissibility Proof for h2(n)
Each tile t must travel at least |r(t) - r_goal(t)| + |c(t) - c_goal(t)| moves. Since no move can decrease distance for two tiles simultaneously, h2(n) <= h*(n).


### Mathematical Dominance Theorem
For any misplaced tile t, Manhattan distance is >= 1. Summing over all misplaced tiles proves h2(n) >= h1(n) for all states n.


### Consistency (Monotonicity) Derivation
Since unit cost c = 1 and any legal move changes Manhattan distance by at most 1, |h2(n) - h2(n')| <= 1 = c(n, a, n').


#### Viva Q1: What is the total size of the 8-puzzle state space?
Answer: 9! = 362,880 total permutations, with exactly half (181,440) reachable from the standard goal.


#### Viva Q2: Is Greedy Best-First Search optimal?
Answer: No. Because GBFS considers only f(n) = h(n) and ignores path cost g(n), it may discover a longer path.


#### Viva Q3: Is GBFS complete?
Answer: Not complete in general infinite graphs; complete in finite state spaces with repeated-state checking.


#### Viva Q4: How does GBFS differ from A*?
Answer: A* uses f(n) = g(n) + h(n), while GBFS uses f(n) = h(n) purely.
