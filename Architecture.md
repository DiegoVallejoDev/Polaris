# POLARIS Architecture

**Policy Optimization via Layered Agents and Recursive Inference Search**

## Table of Contents

- [Overview](#overview)
- [Core Principles](#core-principles)
- [System Architecture](#system-architecture)
- [Component Hierarchy](#component-hierarchy)
- [Data Flow](#data-flow)
- [Agent System](#agent-system)
- [Sentinel Oversight](#sentinel-oversight)
- [Domain System](#domain-system)
- [Search Process](#search-process)
- [Design Patterns](#design-patterns)

---

## Overview

POLARIS is a multi-agent decision-making framework that extends Monte Carlo Tree Search (MCTS) with three revolutionary concepts:

1. **Agent-Agnostic Architecture**: Works with any evaluation agent (LLMs, heuristics, neural networks)
2. **Cognitive Layering**: Implements Kahneman's dual-process theory with multiple reasoning layers
3. **Sentinel Oversight**: Meta-cognitive agent that detects bias and ensures diversity

```mermaid
graph TB
    subgraph "POLARIS Framework"
        Engine[PolarisEngine<br/>Orchestrator]

        subgraph "Core MCTS"
            Search[SearchAlgorithm<br/>MCTS Implementation]
            Tree[MCTSTree<br/>State Space Tree]
            Node[TreeNode<br/>State with Statistics]
        end

        subgraph "Agent System"
            Selector[AgentSelector<br/>Strategy Selection]
            BaseAgent[BaseAgent<br/>Abstract Interface]
            WebAgents[Web Agents<br/>OpenAI/Anthropic/Google]
            HeuristicAgents[Heuristic Agents<br/>Domain-Specific Logic]
        end

        subgraph "Sentinel System"
            Sentinel[SentinelAgent<br/>Meta-Evaluator]
            BiasDetector[BiasDetector<br/>Pattern Analysis]
            DiversityAnalyzer[DiversityAnalyzer<br/>Diversity Metrics]
        end

        subgraph "Domain System"
            GameState[GameState<br/>State Interface]
            Action[Action<br/>Move Interface]
            Domains[Domain Implementations<br/>Chess/Philosophy/etc]
        end
    end

    Engine --> Search
    Engine --> Sentinel
    Search --> Tree
    Search --> Selector
    Tree --> Node
    Node --> GameState
    Selector --> BaseAgent
    BaseAgent --> WebAgents
    BaseAgent --> HeuristicAgents
    Sentinel --> BiasDetector
    Sentinel --> DiversityAnalyzer
    GameState --> Action
    GameState --> Domains

    style Engine fill:#ff6b6b,stroke:#c92a2a,color:#fff
    style Search fill:#4dabf7,stroke:#1971c2,color:#fff
    style Sentinel fill:#51cf66,stroke:#2f9e44,color:#fff
    style Selector fill:#ffd43b,stroke:#f59f00,color:#000
```

---

## Core Principles

### 1. Layered Cognitive Reasoning

Inspired by Daniel Kahneman's "Thinking, Fast and Slow", POLARIS organizes decision-making in hierarchical layers:

```mermaid
graph LR
    subgraph "Cognitive Layers"
        Reflex[Reflex<br/>Instant Response]
        Impulse[Impulse<br/>Quick Intuition]
        Heuristic[Heuristic<br/>Pattern Recognition]
        Deliberation[Deliberation<br/>Deep Analysis]
        MetaReasoning[Meta-Reasoning<br/>Strategic Planning]
        Polaris[Polaris<br/>Multi-Agent Synthesis]
    end

    Reflex --> Impulse
    Impulse --> Heuristic
    Heuristic --> Deliberation
    Deliberation --> MetaReasoning
    MetaReasoning --> Polaris

    style Reflex fill:#e03131
    style Impulse fill:#f76707
    style Heuristic fill:#f59f00
    style Deliberation fill:#37b24d
    style MetaReasoning fill:#1971c2
    style Polaris fill:#7950f2
```

### 2. Agent-Agnostic Design

POLARIS doesn't care about the implementation details of agents. Any system that can evaluate a state is valid:

- **Large Language Models** (GPT-4, Claude, Gemini)
- **Neural Networks** (AlphaZero-style networks)
- **Heuristic Functions** (Hand-crafted evaluation)
- **Hybrid Systems** (Combining multiple approaches)

### 3. Sentinel Oversight

Unlike traditional MCTS, POLARIS includes a **Sentinel Agent** that monitors the search process:

- Detects systematic, temporal, positional, and confirmation biases
- Analyzes evaluation diversity and groupthink
- Applies corrective adjustments to maintain search quality
- Provides transparency through intervention statistics

---

## System Architecture

### High-Level Component View

```mermaid
graph TB
    subgraph "Application Layer"
        Demo[Demo Applications]
        Tests[Test Suites]
        Examples[Example Implementations]
    end

    subgraph "Framework Layer"
        Engine[POLARIS Engine]
        Factory[Agent Factory]
        Config[Configuration System]
        Utils[Utilities & Logging]
    end

    subgraph "Core Layer"
        Search[Search Algorithm]
        Tree[Tree Management]
        Selection[Agent Selection]
    end

    subgraph "Agent Layer"
        AgentBase[Base Agent Interface]
        WebAPI[Web API Agents]
        Heuristic[Heuristic Agents]
    end

    subgraph "Oversight Layer"
        Sentinel[Sentinel Agent]
        Bias[Bias Detection]
        Diversity[Diversity Analysis]
    end

    subgraph "Domain Layer"
        StateBase[Game State Interface]
        ActionBase[Action Interface]
        DomainImpl[Domain Implementations]
    end

    Demo --> Engine
    Tests --> Engine
    Examples --> Engine
    Engine --> Factory
    Engine --> Search
    Factory --> Config
    Search --> Tree
    Search --> Selection
    Search --> Sentinel
    Selection --> AgentBase
    AgentBase --> WebAPI
    AgentBase --> Heuristic
    Sentinel --> Bias
    Sentinel --> Diversity
    Tree --> StateBase
    StateBase --> ActionBase
    StateBase --> DomainImpl

    style Engine fill:#ff6b6b,stroke:#c92a2a,color:#fff
    style Search fill:#4dabf7,stroke:#1971c2,color:#fff
    style Sentinel fill:#51cf66,stroke:#2f9e44,color:#fff
    style AgentBase fill:#ffd43b,stroke:#f59f00,color:#000
```

---

## Component Hierarchy

### POLARIS Engine (Orchestrator)

The main entry point that coordinates all framework components.

```mermaid
classDiagram
    class PolarisEngine {
        -config: PolarisConfig
        -agents: Map~string, Agent~
        -sentinel: SentinelAgent
        -searchAlgorithm: SearchAlgorithm
        -agentSelector: AgentSelector
        +search(initialState): PolarisResult
        +addAgent(agent): void
        +setSentinel(sentinel): void
        +cleanup(): void
    }

    class PolarisResult {
        +bestAction: Action
        +bestScore: number
        +confidence: number
        +sentinelAnalysis: SentinelEvaluation
        +engineStatistics: EngineStatistics
        +agentPerformance: Map
    }

    class EngineStatistics {
        +totalExecutionTime: number
        +phaseBreakdown: PhaseTimings
        +treeStatistics: TreeStats
        +agentCoordination: CoordinationStats
    }

    PolarisEngine --> PolarisResult
    PolarisResult --> EngineStatistics
```

### Search Algorithm (Core MCTS)

Implements the Monte Carlo Tree Search with agent diversity.

```mermaid
classDiagram
    class SearchAlgorithm {
        -config: SearchConfig
        -statistics: SearchStatistics
        +search(tree, agents, selector): SearchResult
        -selection(node): TreeNode
        -expansion(node): TreeNode[]
        -simulation(node, agent): number
        -backpropagation(node, reward): void
    }

    class MCTSTree {
        -root: TreeNode
        -nodeCount: number
        +getRoot(): TreeNode
        +addNode(parent, action, state): TreeNode
        +findBestPath(): TreeNode[]
        +pruneTree(depth): void
    }

    class TreeNode {
        +state: GameState
        +parent: TreeNode
        +children: Map~string, TreeNode~
        +visits: number
        +totalReward: number
        +agentEvaluations: Map
        +calculateUCB1(c): number
        +update(reward, agentId): void
    }

    SearchAlgorithm --> MCTSTree
    MCTSTree --> TreeNode
```

---

## Data Flow

### MCTS Iteration Flow

```mermaid
sequenceDiagram
    participant Engine as POLARIS Engine
    participant Search as Search Algorithm
    participant Tree as MCTS Tree
    participant Selector as Agent Selector
    participant Agent as Evaluation Agent
    participant Sentinel as Sentinel Agent

    Engine->>Search: search(initialState)

    loop For each simulation
        Search->>Tree: Selection Phase
        Tree-->>Search: Selected Node

        Search->>Tree: Expansion Phase
        Tree-->>Search: New Nodes

        Search->>Selector: Select Agent
        Selector-->>Search: Chosen Agent

        Search->>Agent: Simulation Phase
        Agent-->>Search: Evaluation Score

        Search->>Tree: Backpropagation Phase
        Tree-->>Search: Updated Statistics
    end

    Search->>Sentinel: Analyze Search
    Sentinel-->>Search: Bias & Diversity Report

    Search-->>Engine: Final Results
```

### Evaluation Flow with Sentinel

```mermaid
sequenceDiagram
    participant Node as Tree Node
    participant Agents as Multiple Agents
    participant Sentinel as Sentinel Agent
    participant Bias as Bias Detector
    participant Diversity as Diversity Analyzer

    Node->>Agents: Request Evaluations

    par Agent Evaluations
        Agents->>Agents: Agent 1 Evaluates
        Agents->>Agents: Agent 2 Evaluates
        Agents->>Agents: Agent 3 Evaluates
    end

    Agents-->>Node: Store Evaluations

    Node->>Sentinel: Analyze Evaluations

    Sentinel->>Bias: Detect Bias
    Bias-->>Sentinel: Bias Reports

    Sentinel->>Diversity: Analyze Diversity
    Diversity-->>Sentinel: Diversity Analysis

    Sentinel->>Sentinel: Calculate Adjustments
    Sentinel-->>Node: Score Adjustments & Recommendations
```

---

## Agent System

### Agent Hierarchy

```mermaid
classDiagram
    class Agent {
        <<interface>>
        +id: string
        +name: string
        +type: string
        +evaluate(state): EvaluationResult
        +selectAction(state, actions): Action
        +getStatistics(): AgentStatistics
        +isReady(): boolean
    }

    class BaseAgent {
        <<abstract>>
        #statistics: AgentStatistics
        #initialized: boolean
        +initialize(): void
        +cleanup(): void
        #updateStatistics(evaluation): void
        #handleError(error): void
    }

    class OpenAIAgent {
        -client: OpenAI
        -model: string
        +evaluate(state): EvaluationResult
    }

    class AnthropicAgent {
        -client: Anthropic
        -model: string
        +evaluate(state): EvaluationResult
    }

    class GoogleAgent {
        -client: GoogleGenerativeAI
        -model: string
        +evaluate(state): EvaluationResult
    }

    class HeuristicAgent {
        -evaluationFunction: Function
        +evaluate(state): EvaluationResult
    }

    Agent <|.. BaseAgent
    BaseAgent <|-- OpenAIAgent
    BaseAgent <|-- AnthropicAgent
    BaseAgent <|-- GoogleAgent
    BaseAgent <|-- HeuristicAgent
```

### Agent Selection Strategies

```mermaid
graph TD
    Start[Agent Selection Request]

    Start --> Strategy{Selection<br/>Strategy?}

    Strategy -->|Round Robin| RR[Cycle Through<br/>Agents Sequentially]
    Strategy -->|Performance Based| PB[Weight by<br/>Performance Scores]
    Strategy -->|Diversity Maximizing| DM[Prefer Unevaluated<br/>Agents]
    Strategy -->|Adaptive| AD[Balance Performance<br/>& Diversity by Depth]
    Strategy -->|Random| RND[Random Selection]

    RR --> Select[Selected Agent]
    PB --> Select
    DM --> Select
    AD --> Select
    RND --> Select

    Select --> Evaluate[Evaluate State]
    Evaluate --> Update[Update Agent Stats]

    style Strategy fill:#4dabf7
    style Select fill:#51cf66
```

---

## Sentinel Oversight

### Sentinel Agent Architecture

```mermaid
graph TB
    subgraph "Sentinel Agent"
        Core[Sentinel Core<br/>Meta-Evaluator]

        subgraph "Bias Detection"
            Systematic[Systematic Bias<br/>Agent Tendencies]
            Temporal[Temporal Bias<br/>Time-based Patterns]
            Positional[Positional Bias<br/>Position Effects]
            Confirmation[Confirmation Bias<br/>Prior Beliefs]
        end

        subgraph "Diversity Analysis"
            Score[Score Diversity<br/>Variance Analysis]
            Confidence[Confidence Diversity<br/>Agreement Metrics]
            Groupthink[Groupthink Detection<br/>Consensus Patterns]
        end

        subgraph "Intervention"
            Adjust[Score Adjustments]
            Recommend[Recommendations]
            Report[Reporting & Metrics]
        end
    end

    Core --> Systematic
    Core --> Temporal
    Core --> Positional
    Core --> Confirmation
    Core --> Score
    Core --> Confidence
    Core --> Groupthink

    Systematic --> Adjust
    Temporal --> Adjust
    Positional --> Adjust
    Confirmation --> Adjust
    Score --> Adjust
    Confidence --> Adjust
    Groupthink --> Adjust

    Adjust --> Recommend
    Recommend --> Report

    style Core fill:#51cf66,stroke:#2f9e44,color:#fff
    style Adjust fill:#ff6b6b,stroke:#c92a2a,color:#fff
```

### Bias Detection Pipeline

```mermaid
flowchart LR
    Input[Evaluation<br/>Results]

    Input --> Systematic[Systematic<br/>Bias Check]
    Input --> Temporal[Temporal<br/>Bias Check]
    Input --> Positional[Positional<br/>Bias Check]
    Input --> Confirmation[Confirmation<br/>Bias Check]

    Systematic --> Analyze{Bias<br/>Detected?}
    Temporal --> Analyze
    Positional --> Analyze
    Confirmation --> Analyze

    Analyze -->|Yes| Report[Generate<br/>Bias Report]
    Analyze -->|No| Pass[Pass Through]

    Report --> Adjust[Calculate<br/>Adjustments]
    Pass --> Output[Final<br/>Evaluations]
    Adjust --> Output

    style Analyze fill:#ffd43b
    style Report fill:#ff6b6b
    style Adjust fill:#ff6b6b
```

---

## Domain System

### Domain Interface Structure

```mermaid
classDiagram
    class GameState {
        <<interface>>
        +id: string
        +currentPlayer: PlayerId
        +isTerminal: boolean
        +winner: PlayerId
        +applyAction(action): GameState
        +getValidActions(): Action[]
        +getFeatures(): number[]
        +isDraw(): boolean
    }

    class Action {
        <<interface>>
        +id: string
        +type: string
        +description: string
        +validate(state): boolean
        +execute(state): GameState
    }

    class ChessState {
        +board: ChessBoard
        +enPassant: Position
        +castlingRights: CastlingRights
        +applyAction(action): ChessState
    }

    class ChessAction {
        +from: Position
        +to: Position
        +promotion: Piece
        +validate(state): boolean
    }

    class PhilosophyState {
        +question: string
        +arguments: Argument[]
        +participants: Participant[]
        +consensusLevel: number
        +applyAction(action): PhilosophyState
    }

    class PhilosophyAction {
        +type: ArgumentType
        +content: string
        +stance: Stance
        +validate(state): boolean
    }

    GameState <|.. ChessState
    GameState <|.. PhilosophyState
    Action <|.. ChessAction
    Action <|.. PhilosophyAction
```

### Domain-Agnostic Design

```mermaid
graph TB
    subgraph "POLARIS Core"
        Engine[POLARIS Engine<br/>Domain Agnostic]
        Search[MCTS Algorithm<br/>Domain Agnostic]
    end

    subgraph "Domain Interface"
        GameState[GameState Interface]
        Action[Action Interface]
    end

    subgraph "Game Domains"
        Chess[Chess<br/>Traditional Board Game]
        Go[Go<br/>Territory Control]
        Philosophy[Philosophy<br/>Argumentative Discussion]
        Planning[Planning<br/>Resource Allocation]
    end

    Engine --> GameState
    Search --> GameState
    GameState --> Action

    Action -.-> Chess
    Action -.-> Go
    Action -.-> Philosophy
    Action -.-> Planning

    style Engine fill:#ff6b6b
    style GameState fill:#4dabf7
    style Action fill:#4dabf7
```

---

## Search Process

### Complete MCTS Cycle

```mermaid
stateDiagram-v2
    [*] --> Initialize: Create Root Node

    Initialize --> Selection: Start Iteration

    Selection --> CheckExpanded: Traverse Tree<br/>via UCB1

    CheckExpanded --> Selection: Has Unexplored<br/>Children
    CheckExpanded --> Expansion: All Children<br/>Explored

    Expansion --> AgentSelection: Create New<br/>Nodes

    AgentSelection --> Simulation: Choose Agent<br/>Strategy

    Simulation --> Backpropagation: Agent Evaluates<br/>State

    Backpropagation --> CheckTermination: Update Node<br/>Statistics

    CheckTermination --> Selection: Continue<br/>Search
    CheckTermination --> SentinelAnalysis: Simulations<br/>Complete

    SentinelAnalysis --> ResultGeneration: Bias & Diversity<br/>Analysis

    ResultGeneration --> [*]: Return Best<br/>Action
```

### UCB1 Calculation Flow

```mermaid
flowchart TB
    Start[Calculate UCB1 for Node]

    Start --> CheckVisits{Node<br/>Visited?}

    CheckVisits -->|No| MaxValue[Return Infinity<br/>Prioritize Exploration]
    CheckVisits -->|Yes| Calculate[Calculate Components]

    Calculate --> Exploit[Exploitation Term<br/>Average Reward]
    Calculate --> Explore[Exploration Term<br/>sqrt of ln parent / visits]

    Exploit --> Combine[UCB1 = Exploitation<br/>plus c times Exploration]
    Explore --> Combine

    Combine --> AgentDiversity[Apply Agent<br/>Diversity Factor]

    AgentDiversity --> Result[Final UCB1 Score]

    MaxValue --> Result
    Result --> End[Return Score]

    style Exploit fill:#51cf66
    style Explore fill:#4dabf7
    style Combine fill:#ffd43b
```

---

## Design Patterns

### 1. Strategy Pattern (Agent Selection)

Different strategies for selecting which agent to use:

- **Round Robin**: Fair distribution
- **Performance-Based**: Weighted by quality
- **Diversity-Maximizing**: Avoid redundancy
- **Adaptive**: Context-dependent selection

### 2. Observer Pattern (Sentinel System)

The Sentinel observes evaluations and intervenes when necessary:

- Monitors all agent evaluations
- Detects patterns and anomalies
- Provides feedback without blocking
- Maintains history for trend analysis

### 3. Template Method Pattern (Agent Base)

Common agent lifecycle with customizable evaluation:

```typescript
abstract class BaseAgent {
  async evaluate(state: GameState): EvaluationResult {
    // Template method with hooks
    this.beforeEvaluate();
    const result = await this.doEvaluate(state); // Abstract
    this.afterEvaluate(result);
    return result;
  }

  protected abstract doEvaluate(state: GameState): EvaluationResult;
}
```

### 4. Builder Pattern (Configuration)

Fluent configuration building:

```typescript
const config = new ConfigBuilder()
  .withSearch({ simulationsPerNode: 1000 })
  .withSentinel({ diversityThreshold: 0.7 })
  .withAgents([agent1, agent2, agent3])
  .build();
```

### 5. Factory Pattern (Agent Creation)

Centralized agent instantiation:

```typescript
const agent = AgentFactory.create("openai", {
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4",
});
```

---

## Key Features

### 1. Multi-Agent Diversity

- **Parallel Reasoning**: Multiple agents evaluate simultaneously
- **Bias Mitigation**: Diverse perspectives reduce systematic errors
- **Consensus Building**: Aggregated opinions improve reliability

### 2. Meta-Cognitive Oversight

- **Bias Detection**: Identifies systematic evaluation patterns
- **Diversity Analysis**: Measures evaluation variance
- **Corrective Intervention**: Adjusts scores to maintain quality

### 3. Domain Flexibility

- **Game AI**: Chess, Go, strategic games
- **Planning**: Resource allocation, scheduling
- **Discussion**: Philosophical debates, consensus-building
- **Research**: Multi-perspective analysis

### 4. Production-Ready Features

- **Error Handling**: Graceful degradation and recovery
- **Performance Monitoring**: Detailed statistics and profiling
- **Memory Management**: Tree pruning and resource limits
- **Logging & Debugging**: Comprehensive instrumentation

---

## Performance Characteristics

### Complexity Analysis

```mermaid
graph TB
    subgraph TimeComplexity["Time Complexity"]
        Selection[Selection: O log n]
        Expansion[Expansion: O b]
        Simulation[Simulation: O 1 per agent]
        Backprop[Backpropagation: O d]
    end

    subgraph SpaceComplexity["Space Complexity"]
        Tree[Tree Storage: O n]
        Agents[Agent State: O a]
        History[Sentinel History: O h]
    end

    style Selection fill:#4dabf7
    style Simulation fill:#51cf66
    style Tree fill:#ff6b6b
```

- **n**: Number of nodes in tree
- **b**: Branching factor (actions per state)
- **d**: Depth of tree
- **a**: Number of agents
- **h**: History size for sentinel### Scalability Factors

1. **Horizontal Scaling**: Multiple agents can evaluate in parallel
2. **Vertical Scaling**: Tree pruning and progressive widening
3. **Time Management**: Early termination and time limits
4. **Memory Management**: Automatic pruning under pressure

---

## Future Extensions

### Planned Features

```mermaid
mindmap
  root((POLARIS<br/>Future))
    Parallelization
      Multi-threaded Search
      Distributed Agents
      GPU Acceleration
    Advanced Agents
      RL Integration
      Neural Networks
      Ensemble Methods
    Enhanced Sentinel
      Causal Analysis
      Counterfactual Reasoning
      Adaptive Thresholds
    New Domains
      Real-time Games
      Continuous Spaces
      Multi-player Scenarios
    Visualization
      Interactive Tree Explorer
      Live Metrics Dashboard
      Replay System
```

---

## Conclusion

POLARIS represents a novel approach to decision-making that:

1. **Embraces Diversity**: Multiple agents with different biases create robust evaluations
2. **Provides Oversight**: Sentinel system ensures quality and transparency
3. **Enables Flexibility**: Domain-agnostic design works across problem spaces
4. **Scales Effectively**: Production-ready features support real-world applications

The framework is built on solid software engineering principles while implementing cutting-edge AI research concepts, making it both practical and innovative.

---

## References

- Kahneman, D. (2011). _Thinking, Fast and Slow_
- Browne, C. et al. (2012). "A Survey of Monte Carlo Tree Search Methods"
- Silver, D. et al. (2017). "Mastering Chess and Shogi by Self-Play with a General Reinforcement Learning Algorithm"

---

_For more information, see [README.md](README.md) and [PHILOSOPHY_DEMO.md](PHILOSOPHY_DEMO.md)_
