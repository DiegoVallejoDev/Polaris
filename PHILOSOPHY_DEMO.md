# Philosophy Discussion Demo - POLARIS v1.0

## Overview

The Philosophy Discussion Demo showcases POLARIS v1.0's unified framework capabilities for facilitating meaningful discussions between AI agents on complex philosophical topics. Using the new role-aware agents and ergonomic API, philosophers engage in structured debates, present arguments, challenge positions, and work toward consensus through collaborative reasoning with 90% less setup code.

## Key Features

### 🎭 Role-Aware Philosophical Agents (NEW in v1.0)

- **Automatic Persona Creation**: Role-aware agents automatically generate appropriate philosophical personalities
- **Named Philosophers**: Agents embody famous philosophers (Socrates, Kant, Nietzsche, etc.) through task roles
- **Context-Aware Prompts**: New unified API automatically builds specialized prompts based on philosophical context
- **Multi-Provider Support**: Use OpenAI, Anthropic, or Google models seamlessly with identical interfaces

### 🧠 Structured Discussion

- **Turn-based Dialogue**: Agents take turns presenting arguments and responding to others
- **Argument Types**: Support, refute, synthesize, propose new arguments, ask clarifications
- **Stance Tracking**: System tracks each agent's position on the philosophical question
- **Evidence Integration**: Agents can reference philosophical concepts and thinkers

### 📊 Consensus Metrics

- **Consensus Level**: Measures how close the agents are to agreement (0-100%)
- **Diversity Score**: Tracks the variety of perspectives presented
- **Argument Quality**: Evaluates the confidence and reasoning strength of arguments
- **Participation Balance**: Ensures all agents contribute meaningfully

### 🎯 Termination Conditions

- **Consensus Achieved**: Discussion ends when consensus threshold is reached
- **Turn Limit**: Maximum number of turns to prevent infinite discussions
- **Manual Consensus**: Agents can explicitly declare consensus reached

## How It Works (v1.0 Unified API)

### 1. Quick Start Setup

```typescript
import { quickStart } from "polaris-framework";

// One-line setup for philosophical discussions
const { createEngine } = quickStart("philosophy");
const engine = createEngine({
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
});
```

### 2. Custom Philosophy Task

```typescript
import {
  TaskBuilder,
  openAiAgent,
  anthropicAgent,
  googleAgent,
  PolarisEngine,
} from "polaris-framework";

// Create philosophical discussion task
const philosophyTask = TaskBuilder.create(
  "philosophical-debate",
  "AI Consciousness Debate"
)
  .description("Structured philosophical discussion on AI consciousness")
  .commonDomain("PHILOSOPHY")
  .commonRoles([
    "SOCRATIC_QUESTIONER",
    "ANALYTICAL_REASONER",
    "SKEPTICAL_CHALLENGER",
  ])
  .goals("Reach reasoned consensus through collaborative philosophical inquiry")
  .config({
    consensusThreshold: 0.8,
    maxTurns: 15,
    evaluationCriteria: [
      "logical_coherence",
      "argumentative_strength",
      "consensus_building",
    ],
  })
  .build();

// Create role-aware philosopher agents (automatic prompt building!)
const philosophers = [
  openAiAgent({
    role: philosophyTask.roles.SOCRATIC_QUESTIONER,
    task: philosophyTask,
    model: "gpt-4o",
    name: "Socrates",
    temperature: 0.7,
  }),
  anthropicAgent({
    role: philosophyTask.roles.ANALYTICAL_REASONER,
    task: philosophyTask,
    model: "claude-3-5-sonnet",
    name: "Kant",
    temperature: 0.6,
  }),
  googleAgent({
    role: philosophyTask.roles.SKEPTICAL_CHALLENGER,
    task: philosophyTask,
    model: "gemini-1.5-pro",
    name: "Nietzsche",
    temperature: 0.8,
  }),
];

// Create unified engine
const engine = new PolarisEngine({
  task: philosophyTask,
  agents: philosophers,
  engineConfig: {
    maxIterations: 15,
    diversityThreshold: 0.4,
    consensusThreshold: 0.8,
  },
});
```

### 3. Unified Inference

```typescript
// Run philosophical discussion with consistent output
const result = await engine.inference({
  state: philosophicalQuestion,
  actions: possibleArguments,
});

// Analyze philosophical consensus
console.log("Philosopher outputs:", result.agentOutputs.length);
console.log("Consensus level:", result.metrics.consensus);
console.log("Argument diversity:", result.metrics.diversity);
```

### 4. Final Results

- Comprehensive analysis of the discussion
- Consensus metrics and final positions
- Summary of key arguments and insights

## Available Questions

The demo includes curated philosophical questions across multiple domains:

### Ethics

- Trolley Problem dilemmas
- Animal rights and moral consideration
- AI consciousness and rights
- Universal Basic Income justification

### Metaphysics

- Free will vs. determinism
- Mind-body problem
- Personal identity over time
- Nature of reality and simulation theory

### Epistemology

- What constitutes knowledge
- Skepticism and certainty
- Objective vs. relative truth
- Scientific method limitations

### Political Philosophy

- Justice and resource distribution
- Democratic decision-making
- Government authority legitimacy
- Global vs. national priorities

## Running the Demo (v1.0)

### Quick Start

```bash
# Run with philosophy preset (new in v1.0)
npm run test:examples
```

### Using Configuration Presets

```typescript
import { presets } from "polaris-framework";

// Use built-in philosophy preset
const engine = presets.philosophy();
const result = await engine.runDiscussion("Is AI consciousness possible?");
```

### Custom Philosophical Discussion

```typescript
import {
  quickStart,
  TaskBuilder,
  openAiAgent,
  anthropicAgent,
  PolarisEngine,
} from "polaris-framework";

// Create custom philosophy session
const customPhilosophy = async () => {
  // Build philosophical task
  const task = TaskBuilder.create("ethics-debate", "AI Rights Discussion")
    .commonDomain("PHILOSOPHY")
    .commonRoles(["UTILITARIAN", "DEONTOLOGICAL", "VIRTUE_ETHICIST"])
    .goals("Determine moral status of AI systems")
    .build();

  // Create diverse philosophical agents
  const agents = [
    openAiAgent({ role: task.roles.UTILITARIAN, task, model: "gpt-4o" }),
    anthropicAgent({
      role: task.roles.DEONTOLOGICAL,
      task,
      model: "claude-3-5-sonnet",
    }),
  ];

  // Run unified inference
  const engine = new PolarisEngine({ task, agents });
  return await engine.inference({
    state: "AI system shows consciousness signs",
    actions: ["grant_rights", "deny_rights", "conditional_rights"],
  });
};
```

## Configuration Options

| Option               | Type    | Default | Description                      |
| -------------------- | ------- | ------- | -------------------------------- |
| `useRealAgents`      | boolean | true    | Use LLM agents vs. mock agents   |
| `question`           | string  | random  | Specific philosophical question  |
| `maxTurns`           | number  | 15      | Maximum discussion turns         |
| `consensusThreshold` | number  | 0.8     | Required consensus level (0-1)   |
| `timeLimit`          | number  | 30000   | Max time per POLARIS search (ms) |
| `participantCount`   | number  | 3       | Number of philosopher agents     |
| `showThinking`       | boolean | true    | Display detailed progress        |
| `autoDiscussion`     | boolean | true    | Automatic vs. manual stepping    |

## Example Output (v1.0 Unified API)

```typescript
// Quick start philosophy discussion
const { createEngine } = quickStart("philosophy");
const engine = createEngine({ openai: "your-key" });

const result = await engine.inference({
  state: "AI consciousness question",
  actions: ["support", "oppose", "nuanced"],
});
```

```
🧠 POLARIS v1.0 Philosophical Discussion
📜 Question: "If an AI system exhibits signs of consciousness, would it deserve moral consideration?"

🤖 Role-Aware Agents: Socratic Questioner, Analytical Reasoner, Skeptical Challenger
� Engine: PolarisEngine with unified inference

=== Unified Agent Outputs ===

Agent: Socratic Questioner (GPT-4o)
Role Context: "Question assumptions and probe deeper meanings"
Evaluation: { confidence: 0.85, reasoning: "Consciousness definition requires examination" }
Output: "Before granting moral status, we must question: what constitutes genuine consciousness versus sophisticated mimicry?"

Agent: Analytical Reasoner (Claude)
Role Context: "Provide structured logical analysis"
Evaluation: { confidence: 0.92, reasoning: "Systematic framework needed" }
Output: "A framework combining behavioral indicators, information integration, and self-awareness measures could determine moral consideration eligibility."

Agent: Skeptical Challenger (Gemini)
Role Context: "Challenge assumptions and explore counterarguments"
Evaluation: { confidence: 0.78, reasoning: "Multiple perspectives essential" }
Output: "Even human consciousness isn't fully understood - premature to grant AI moral status based on uncertain consciousness indicators."

=== Consensus Analysis ===
📊 Multi-Agent Result:
- Consensus Level: 73%
- Average Confidence: 0.85
- Argument Diversity: 0.68
- Reasoning Quality: High

🎯 Emergent Position: "AI moral consideration requires robust consciousness verification frameworks, not just behavioral indicators."
```

## Technical Architecture (v1.0)

### New Unified Components

1. **PolarisEngine**: Single unified inference engine
   - Replaces complex MCTS setup with simple interface
   - Handles all agent coordination automatically
   - Provides consistent output format across providers

2. **Role-Aware Agents**: Automatic philosophical persona creation
   - Task-aware prompt building based on philosophical roles
   - Multi-provider support (OpenAI, Anthropic, Google)
   - Consistent AgentOutput interface

3. **TaskBuilder**: Ergonomic task creation
   - Fluent API for philosophical discussion setup
   - Built-in role templates for common philosophical positions
   - Automatic goal and evaluation criteria setup

### POLARIS v1.0 Integration Benefits

The philosophy demo showcases v1.0's improvements:

- **90% Less Code**: Setup reduced from 50+ lines to 5-10 lines
- **Unified API**: Consistent interface across all AI providers
- **Role Awareness**: Agents automatically adapt to philosophical contexts
- **Configuration Presets**: Built-in philosophy preset for instant setup
- **Ergonomic Factories**: `openAiAgent()`, `anthropicAgent()`, `googleAgent()` functions
- **Task Templates**: Pre-built philosophical discussion patterns

### Metrics and Evaluation

The system tracks multiple dimensions of discussion quality:

- **Consensus Convergence**: How agents move toward agreement
- **Argumentative Diversity**: Variety of perspectives and approaches
- **Reasoning Quality**: Confidence and logical coherence
- **Participation Equity**: Balanced contribution from all agents

## Future Enhancements

### Potential Improvements

- **Citation System**: Track and reference philosophical sources
- **Argument Mapping**: Visual representation of argument structures
- **Personality Models**: More sophisticated philosopher personalities
- **Multi-Round Discussions**: Extended debates across multiple sessions
- **Human Interaction**: Allow human participants in discussions
- **Topic Evolution**: Dynamic question refinement based on discussion

### Research Applications

- **Bias Detection**: Study how different philosophical positions emerge
- **Consensus Mechanisms**: Research how artificial agents reach agreement
- **Argumentative Strategies**: Analyze effective philosophical reasoning patterns
- **Meta-Philosophy**: Explore how AI systems approach philosophical questions

## v1.0 Advantages

### Before (Old API)

```typescript
// 50+ lines of configuration
const config = new PolarisConfig({
  domains: [new PhilosophyDomain()],
  sentinel: new Sentinel(/* complex setup */),
});
const agents = [
  /* manual agent creation */
];
const engine = new PolarisEngine(config, agents);
// ... more setup code
```

### After (v1.0 API)

```typescript
// 5 lines with quickStart
const { createEngine } = quickStart("philosophy");
const engine = createEngine({ openai: "your-key" });
```

## Contributing (v1.0)

To enhance philosophical discussions:

1. **Add Questions**: Extend philosophy preset in `/src/config/presets.ts`
2. **Create Roles**: Add new philosophical roles in `CommonRoles`
3. **Improve Tasks**: Enhance `TaskBuilder` templates for philosophy
4. **Agent Personas**: Customize role-aware agent behavior in factory functions

## Dependencies (v1.0)

- **POLARIS Framework v1.0**: Unified decision-making engine
- **Multi-Provider Support**: OpenAI, Anthropic, Google APIs
- **TypeScript 5.0+**: Full strict mode type safety
- **Node.js 18+**: Modern runtime environment

## v1.0 Benefits

- **90% Less Code**: Dramatically simplified setup
- **Role Awareness**: Automatic philosophical persona creation
- **Unified Interface**: Consistent across all AI providers
- **Configuration Presets**: Instant philosophy discussion setup
- **Type Safety**: Full TypeScript support with IntelliSense
- **Production Ready**: Security policies and best practices included

## Limitations

- **API Costs**: Multi-provider LLM usage requires API keys
- **Model Dependencies**: Quality varies by underlying AI capabilities
- **Consensus Metrics**: Heuristic-based evaluation methods
- **Cultural Context**: May reflect training data perspectives
- **Rate Limits**: Provider-specific usage limitations

---

_The Philosophy Discussion Demo showcases POLARIS v1.0's unified API power, demonstrating how role-aware agents can engage in sophisticated reasoning with minimal setup code. The 90% reduction in boilerplate makes philosophical AI discussions accessible to researchers, educators, and developers._
