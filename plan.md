# POLARIS - File Structure & Architecture
 
## 📁 Project Structure
 
```
polaris-framework/
├── src/
│   ├── core/                     # Core engine and fundamental classes
│   │   ├── engine.ts            # Main POLARIS engine
│   │   ├── tree.ts              # MCTS tree structure
│   │   ├── node.ts              # Tree node implementation
│   │   └── search.ts            # Search algorithms
│   ├── agents/                   # Agent implementations
│   │   ├── base/                # Base classes and interfaces
│   │   │   ├── agent.ts         # Agent interface and base class
│   │   │   └── parameters.ts    # Agent parameter types
│   │   ├── web-api/             # Web API integrations
│   │   │   ├── openai.ts        # OpenAI GPT integration
│   │   │   ├── anthropic.ts     # Anthropic Claude integration
│   │   │   ├── google.ts        # Google Gemini integration
│   │   │   ├── ollama.ts        # Local Ollama integration
│   │   │   └── web-agent.ts     # Generic web API agent
│   │   ├── heuristic/           # Traditional AI agents
│   │   │   ├── minimax.ts       # Minimax algorithm agent
│   │   │   ├── alpha-beta.ts    # Alpha-beta pruning agent
│   │   │   └── random.ts        # Random action agent
│   │   └── index.ts             # Agent exports
│   ├── sentinel/                 # Sentinel agent system
│   │   ├── sentinel.ts          # Main sentinel implementation
│   │   ├── bias-detector.ts     # Bias detection algorithms
│   │   ├── diversity-analyzer.ts # Diversity analysis
│   │   └── corrector.ts         # Score correction logic
│   ├── domains/                  # Game/problem domain implementations
│   │   ├── base/                # Base domain classes
│   │   │   ├── game-state.ts    # Game state interface
│   │   │   ├── action.ts        # Action interface
│   │   │   └── result.ts        # Result types
│   │   ├── games/               # Game implementations
│   │   │   ├── chess/           # Chess implementation
│   │   │   │   ├── chess-state.ts
│   │   │   │   ├── chess-action.ts
│   │   │   │   └── chess-rules.ts
│   │   │   ├── checkers/        # Checkers implementation
│   │   │   └── go/              # Go implementation
│   │   ├── planning/            # Planning domain
│   │   │   ├── planning-state.ts
│   │   │   └── planning-action.ts
│   │   └── index.ts             # Domain exports
│   ├── utils/                    # Utility functions
│   │   ├── math.ts              # Mathematical utilities
│   │   ├── random.ts            # Random number generation
│   │   ├── logger.ts            # Logging utilities
│   │   ├── performance.ts       # Performance monitoring
│   │   └── validation.ts        # Input validation
│   ├── types/                    # TypeScript type definitions
│   │   ├── config.ts            # Configuration types
│   │   ├── evaluation.ts        # Evaluation result types
│   │   ├── search.ts            # Search result types
│   │   └── common.ts            # Common type definitions
│   ├── errors/                   # Error classes
│   │   ├── base.ts              # Base error class
│   │   ├── api-errors.ts        # API-related errors
│   │   ├── validation-errors.ts # Validation errors
│   │   └── search-errors.ts     # Search-related errors
│   └── index.ts                  # Main package exports
├── tests/                        # Test files
│   ├── unit/                    # Unit tests
│   ├── integration/             # Integration tests
│   └── benchmarks/              # Performance benchmarks
├── examples/                     # Usage examples
│   ├── chess-game.ts
│   ├── strategic-planning.ts
│   └── multi-agent-simulation.ts
├── docs/                         # Documentation
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE
```
 
---
 
## 🔧 Core Classes & Exports
 
### **src/core/engine.ts**
Main orchestration engine for the POLARIS framework.
 
```typescript
export class PolarisEngine {
  constructor(config: PolarisConfig);
  
  // Main search method
  async search(initialState: GameState): Promise<SearchResult>;
  
  // Agent management
  addAgent(agent: Agent): void;
  removeAgent(agentId: string): void;
  getAgents(): Agent[];
  
  // Sentinel management
  setSentinel(sentinel: SentinelAgent): void;
  getSentinel(): SentinelAgent;
  
  // Configuration
  updateConfig(config: Partial<PolarisConfig>): void;
  getConfig(): PolarisConfig;
  
  // Statistics and monitoring
  getStatistics(): SearchStatistics;
  reset(): void;
}
 
export interface PolarisConfig {
  agents: Agent[];
  sentinel: SentinelAgent;
  maxDepth: number;
  simulationsPerNode: number;
  timeLimit?: number;
  explorationConstant?: number;
  parallelism?: number;
  memoryLimit?: string;
}
```
 
### **src/core/tree.ts**
MCTS tree structure with agent diversity support.
 
```typescript
export class MCTSTree {
  constructor(rootState: GameState);
  
  // Tree operations
  getRoot(): TreeNode;
  addNode(parent: TreeNode, action: Action, state: GameState): TreeNode;
  removeSubtree(node: TreeNode): void;
  
  // Search utilities
  findBestPath(): TreeNode[];
  getDepth(): number;
  getNodeCount(): number;
  
  // Memory management
  pruneTree(keepDepth: number): void;
  clear(): void;
}
 
export class TreeNode {
  constructor(state: GameState, parent?: TreeNode, action?: Action);
  
  // Node properties
  readonly id: string;
  readonly state: GameState;
  readonly parent?: TreeNode;
  readonly action?: Action;
  readonly children: Map<string, TreeNode>;
  
  // MCTS statistics
  visits: number;
  totalReward: number;
  agentEvaluations: Map<string, EvaluationResult>;
  
  // Node operations
  addChild(action: Action, state: GameState): TreeNode;
  getChild(actionId: string): TreeNode | undefined;
  isLeaf(): boolean;
  isRoot(): boolean;
  getDepth(): number;
  
  // UCB1 calculation
  calculateUCB1(explorationConstant: number): number;
  getAverageReward(): number;
}
```
 
### **src/core/search.ts**
Core search algorithms and selection strategies.
 
```typescript
export class SearchAlgorithm {
  constructor(config: SearchConfig);
  
  // Main search phases
  async selection(node: TreeNode): Promise<TreeNode>;
  async expansion(node: TreeNode): Promise<TreeNode[]>;
  async simulation(node: TreeNode, agent: Agent): Promise<number>;
  async backpropagation(node: TreeNode, reward: number): Promise<void>;
  
  // Selection strategies
  selectBestChild(node: TreeNode): TreeNode;
  selectUnexploredAction(node: TreeNode): Action | null;
}
 
export class AgentSelector {
  constructor(strategy: SelectionStrategy);
  
  selectAgent(node: TreeNode, availableAgents: Agent[]): Agent;
  updatePerformance(agent: Agent, performance: number): void;
  getAgentStatistics(): Map<string, AgentStats>;
}
 
export enum SelectionStrategy {
  ROUND_ROBIN = 'round_robin',
  PERFORMANCE_BASED = 'performance_based',
  DIVERSITY_MAXIMIZING = 'diversity_maximizing',
  ADAPTIVE = 'adaptive'
}
```
 
---
 
## 🤖 Agent System
 
### **src/agents/base/agent.ts**
Base agent interface and abstract implementation.
 
```typescript
export interface Agent {
  readonly id: string;
  readonly name: string;
  readonly parameters: AgentParameters;
  
  // Core agent methods
  evaluate(state: GameState): Promise<EvaluationResult>;
  selectAction(state: GameState, actions: Action[]): Promise<Action>;
  
  // Agent lifecycle
  initialize?(): Promise<void>;
  cleanup?(): Promise<void>;
  clone(): Agent;
  
  // Performance tracking
  getStatistics(): AgentStatistics;
  resetStatistics(): void;
}
 
export abstract class BaseAgent implements Agent {
  protected constructor(id: string, name: string, parameters: AgentParameters);
  
  abstract evaluate(state: GameState): Promise<EvaluationResult>;
  abstract selectAction(state: GameState, actions: Action[]): Promise<Action>;
  abstract clone(): Agent;
  
  // Common implementations
  getStatistics(): AgentStatistics;
  resetStatistics(): void;
  protected updateStatistics(evaluation: EvaluationResult): void;
}
 
export interface AgentParameters {
  temperature?: number;
  bias?: 'aggressive' | 'conservative' | 'balanced';
  maxThinkingTime?: number;
  randomSeed?: number;
  [key: string]: any;
}
```
 
### **src/agents/web-api/web-agent.ts**
Generic web API agent for LLM integration.
 
```typescript
export class WebAPIAgent extends BaseAgent {
  constructor(config: WebAPIConfig);
  
  async evaluate(state: GameState): Promise<EvaluationResult>;
  async selectAction(state: GameState, actions: Action[]): Promise<Action>;
  clone(): WebAPIAgent;
  
  // API management
  private async makeAPICall(prompt: string): Promise<string>;
  private handleRateLimit(): Promise<void>;
  private parseResponse(response: string): EvaluationResult;
}
 
export interface WebAPIConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'custom';
  apiKey: string;
  model: string;
  baseURL?: string;
  parameters?: AgentParameters;
  rateLimiting?: RateLimitConfig;
  timeout?: number;
}
 
export interface RateLimitConfig {
  requestsPerMinute: number;
  tokensPerMinute?: number;
  retryDelay: number;
  maxRetries: number;
}
```
 
### **src/agents/web-api/openai.ts**
OpenAI GPT integration.
 
```typescript
export class OpenAIAgent extends WebAPIAgent {
  constructor(config: OpenAIConfig);
  
  protected async callAPI(messages: ChatMessage[]): Promise<string>;
  protected buildPrompt(state: GameState, context?: string): ChatMessage[];
  
  // OpenAI specific methods
  private handleStreamingResponse(stream: any): Promise<string>;
  private calculateTokens(text: string): number;
}
 
export interface OpenAIConfig extends WebAPIConfig {
  model: 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo';
  systemPrompt?: string;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
}
```
 
### **src/agents/web-api/anthropic.ts**
Anthropic Claude integration.
 
```typescript
export class AnthropicAgent extends WebAPIAgent {
  constructor(config: AnthropicConfig);
  
  protected async callAPI(prompt: string): Promise<string>;
  protected formatPrompt(state: GameState): string;
  
  // Claude specific methods
  private handleClaudeResponse(response: any): string;
  private buildContext(state: GameState): string;
}
 
export interface AnthropicConfig extends WebAPIConfig {
  model: 'claude-3-opus' | 'claude-3-sonnet' | 'claude-3-haiku';
  maxTokensToSample?: number;
  stopSequences?: string[];
}
```
 
### **src/agents/heuristic/minimax.ts**
Traditional minimax algorithm agent.
 
```typescript
export class MinimaxAgent extends BaseAgent {
  constructor(config: MinimaxConfig);
  
  async evaluate(state: GameState): Promise<EvaluationResult>;
  async selectAction(state: GameState, actions: Action[]): Promise<Action>;
  clone(): MinimaxAgent;
  
  // Minimax specific methods
  private minimax(state: GameState, depth: number, maximizing: boolean): number;
  private evaluatePosition(state: GameState): number;
}
 
export interface MinimaxConfig {
  maxDepth: number;
  evaluationFunction?: (state: GameState) => number;
  transpositionTable?: boolean;
}
```
 
--- 
🛡️ Sentinel System
src/sentinel/sentinel.ts
Main sentinel agent implementation.

```typescript
export class SentinelAgent {
  constructor(config: SentinelConfig);
  // Main evaluation method
  async evaluate(node: TreeNode, children: TreeNode[]): Promise<SentinelEvaluation>;
  // Analysis methods
  detectBias(evaluations: EvaluationResult[]): BiasReport;
  analyzeDiversity(evaluations: EvaluationResult[]): DiversityAnalysis;
  adjustScores(scores: number[], context: EvaluationContext): number[];
  // Configuration
  updateConfig(config: Partial<SentinelConfig>): void;
  getConfig(): SentinelConfig;
}

export interface SentinelConfig {
  diversityThreshold: number;
  biasDetectionEnabled: boolean;
  correctionStrength: number;
  analysisDepth: number;
  learningEnabled?: boolean;
}

export interface SentinelEvaluation {
  biasDetected: boolean;
  diversityScore: number;
  recommendations: string[];
  scoreAdjustments: Record<string, number>;
  confidence: number;
  metadata?: Record<string, any>;
}
```

src/sentinel/bias-detector.ts
Bias detection algorithms and analysis.
```typescript
export class BiasDetector {
  constructor(config: BiasDetectionConfig);
  detectSystematicBias(evaluations: EvaluationResult[]): BiasReport;
  detectTemporalBias(history: EvaluationResult[]): BiasReport;
  detectPositionalBias(evaluations: EvaluationResult[], positions: GameState[]): BiasReport;

  // Analysis methods
  private calculateBiasScore(values: number[]): number;
  private identifyBiasPattern(evaluations: EvaluationResult[]): BiasPattern;
}

export interface BiasReport {
  biasType: BiasType;
  severity: number;
  description: string;
  affectedAgents: string[];
  recommendations: string[];
}

export enum BiasType {
  SYSTEMATIC = 'systematic',
  TEMPORAL = 'temporal',
  POSITIONAL = 'positional',
  CONFIRMATION = 'confirmation',
  ANCHORING = 'anchoring'
}
```
src/sentinel/diversity-analyzer.ts
Diversity analysis and measurement.
```typescript
export class DiversityAnalyzer {
  constructor(config: DiversityConfig);
  analyzeDiversity(evaluations: EvaluationResult[]): DiversityAnalysis;
  calculateDiversityScore(values: number[]): number;
  identifyGroupThink(evaluations: EvaluationResult[]): boolean;

  // Metrics
  private calculateEntropy(distribution: number[]): number;
  private calculateVariance(values: number[]): number;
  private measureDisagreement(evaluations: EvaluationResult[]): number;
}

export interface DiversityAnalysis {
  overallScore: number;
  entropy: number;
  variance: number;
  disagreementLevel: number;
  groupThinkDetected: boolean;
  recommendations: string[];
}
```
🎮 Domain System
src/domains/base/game-state.ts
```typescript
Base game state interface and utilities.
export interface GameState {
  readonly id: string;
  readonly currentPlayer: number;
  readonly isTerminal: boolean;
  readonly winner?: number;

  // State operations
  clone(): GameState;
  applyAction(action: Action): GameState;
  getValidActions(): Action[];
  serialize(): string;

  // Evaluation support
  getFeatures(): number[];
  getHashKey(): string;
  equals(other: GameState): boolean;
}

export abstract class BaseGameState implements GameState {
  protected constructor(currentPlayer: number);
  abstract clone(): GameState;
  abstract applyAction(action: Action): GameState;
  abstract getValidActions(): Action[];
  abstract serialize(): string;

  // Common implementations
  getHashKey(): string;
  equals(other: GameState): boolean;
}
```
src/domains/games/chess/chess-state.ts
Chess game implementation.

```typescript
export class ChessState extends BaseGameState {
  constructor(fen?: string);

  // Chess-specific state
  readonly board: ChessBoard;
  readonly castlingRights: CastlingRights;
  readonly enPassantSquare?: Square;
  readonly halfmoveClock: number;
  readonly fullmoveNumber: number;

  // GameState implementation
  clone(): ChessState;
  applyAction(action: ChessAction): ChessState;
  getValidActions(): ChessAction[];
  serialize(): string;

  // Chess-specific methods
  isInCheck(player: number): boolean;
  isCheckmate(): boolean;
  isStalemate(): boolean;
  getFEN(): string;
  getPGN(): string;
}

export class ChessBoard {
  constructor(position?: string);
  getPiece(square: Square): ChessPiece | null;
  setPiece(square: Square, piece: ChessPiece | null): void;
  movePiece(from: Square, to: Square): void;

  // Analysis methods
  isSquareAttacked(square: Square, byPlayer: number): boolean;
  getAttackers(square: Square): Square[];
  getMaterialBalance(): number;
}
```

📊 Types & Interfaces
src/types/evaluation.ts
Evaluation result types and interfaces.
```typescript
export interface EvaluationResult { score: number; confidence: number; reasoning?: string; metadata?: Record<string, any>; evaluationTime?: number; features?: number[]; } export interface SearchResult { bestAction: Action; bestScore: number; confidence: number; statistics: SearchStatistics; tree?: MCTSTree; evaluations: EvaluationResult[]; } export interface SearchStatistics { nodesExplored: number; totalSimulations: number; searchTime: number; averageDepth: number; maxDepth: number; agentUsage: Map<string, number>; sentinelInterventions: number; } 
src/types/config.ts
Configuration type definitions.
export interface EngineConfig { maxDepth: number; simulationsPerNode: number; timeLimit?: number; explorationConstant: number; parallelism: number; memoryLimit?: string; } export interface AgentConfig { type: string; parameters: AgentParameters; weight?: number; enabled: boolean; } export interface DomainConfig { name: string; stateClass: string; actionClass: string; rules?: Record<string, any>; } 
```
🔧 Utilities & Helpers
src/utils/math.ts
Mathematical utility functions.
```typescript
export class MathUtils {
  static ucb1(value: number, visits: number, parentVisits: number, c: number): number;
  static normalize(values: number[]): number[];
  static entropy(distribution: number[]): number;
  static variance(values: number[]): number;
  static standardDeviation(values: number[]): number;
  static sigmoid(x: number): number;
  static softmax(values: number[]): number[];
}

export class RandomUtils {
  static seed(value: number): void;
  static random(): number;
  static randomInt(min: number, max: number): number;
  static choice<T>(array: T[]): T;
  static shuffle<T>(array: T[]): T[];
  static weightedChoice<T>(items: T[], weights: number[]): T;
}
```

src/utils/logger.ts
Logging and debugging utilities.
```typescript
export class Logger {
  constructor(name: string, level: LogLevel);
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, error?: Error): void;
  createChild(name: string): Logger;
  setLevel(level: LogLevel): void;
}

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}
```
📦 Main Package Exports
src/index.ts
Main package entry point with all exports.
```typescript
// Core engine
export { PolarisEngine } from './core/engine';
export { MCTSTree, TreeNode } from './core/tree';
export { SearchAlgorithm, AgentSelector } from './core/search';

// Agent system
export { Agent, BaseAgent } from './agents/base/agent';
export { WebAPIAgent } from './agents/web-api/web-agent';
export { OpenAIAgent } from './agents/web-api/openai';
export { AnthropicAgent } from './agents/web-api/anthropic';
export { MinimaxAgent } from './agents/heuristic/minimax';

// Sentinel system
export { SentinelAgent } from './sentinel/sentinel';
export { BiasDetector } from './sentinel/bias-detector';
export { DiversityAnalyzer } from './sentinel/diversity-analyzer';

// Domains
export { GameState, BaseGameState } from './domains/base/game-state';
export { ChessState } from './domains/games/chess/chess-state';
export { PlanningState } from './domains/planning/planning-state';

// Types
export * from './types/evaluation';
export * from './types/config';
export * from './types/search';
export * from './types/common';

// Utilities
export { MathUtils, RandomUtils } from './utils/math';
export { Logger } from './utils/logger';

// Errors
export * from './errors';
```
This file structure provides a clean, modular architecture that supports the agent-agnostic design while maintaining clear separation of concerns. Each module has well-defined responsibilities and exports, making the framework easy to extend and maintain.
 