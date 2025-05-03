# POLARIS

> **"When choices are infinite, Polaris points the way."**  
> *Recursive decision-making through layered agent variation.*

---

## Overview

**POLARIS** (Policy Optimization via Layered Agent Recursive Inference Search) is a decision-search technique that enhances classic **Monte Carlo Tree Search (MCTS)** by introducing **agent variation** at each node. Instead of simulating decisions from a single fixed policy, POLARIS explores multiple versions of agents—each with slightly different reasoning parameters—to find the most robust path.

This enables not only deeper search but **wider exploration across diverse strategic perspectives**.

---

## Key Concepts

- **Layered Agent Variation:** Each node in the MCTS tree has its own "agent personality" (e.g., aggression level, depth, evaluation bias).
- **Recursive Simulation:** Child nodes simulate the game state from their agent’s unique perspective.
- **Backpropagation:** Rewards are returned and aggregated through the tree, allowing for collective learning.

---

## System Architecture (Mermaid)

```mermaid
graph TD
    PolarisStart[Start: Root Node (current game state)]
    PolarisStart --> A1[Agent A - aggressive]
    PolarisStart --> A2[Agent B - defensive]
    PolarisStart --> A3[Agent C - balanced]

    A1 --> A1S1[Simulate move 1]
    A1 --> A1S2[Simulate move 2]

    A2 --> A2S1[Simulate move 1]
    A2 --> A2S2[Simulate move 2]

    A3 --> A3S1[Simulate move 1]
    A3 --> A3S2[Simulate move 2]

    subgraph Backpropagation
        A1S1 --> A1
        A1S2 --> A1
        A2S1 --> A2
        A2S2 --> A2
        A3S1 --> A3
        A3S2 --> A3
        A1 --> PolarisStart
        A2 --> PolarisStart
        A3 --> PolarisStart
    end
```

---

## Example Use Case: Chess AI

```typescript 
const root = new PolarisNode({
  fen: initialFen,
  agentParams: defaultAgentParams,
  depth: 0
});

const bestMove = polarisSearch(root, {
  iterations: 1000,
  childrenPerNode: 5,
  agentVariations: generateVariations(defaultAgentParams)
});
```

---

## Why Not Just Scale?

```mermaid
flowchart TD
    H[Horizontal Scaling] -->|more CPUs| H_Limits[High cost, low insight]
    V[Vertical Scaling] -->|bigger models| V_Limits[Expensive, brittle]

    POL[POLARIS] -->|smarter exploration| RobustPaths[Robust Strategies Found]

    classDef strong fill:#0d1117,stroke:#58a6ff,stroke-width:2px;
    class POL,strong
```


# Coming Soon
