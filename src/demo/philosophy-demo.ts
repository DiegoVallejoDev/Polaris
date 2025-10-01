/**
 * POLARIS Philosophical Discussion Demo
 * Demonstrates AI agents engaging in philosophical debate and reaching consensus
 */

import { PolarisEngine } from "../core/engine";
import { WebAgentFactory } from "../agents/web";
import {
  PhilosophyState,
  PhilosophyUtils,
  PHILOSOPHICAL_QUESTIONS,
} from "../domains/philosophy";
import { EnvironmentConfig } from "../utils/config";
import { Logger } from "../utils/logger";
import { PolarisConfig } from "../types/config";
import { PhilosophyAction } from "../domains/philosophy/philosophy-action";
import { Agent } from "../agents/base/agent";

/**
 * Configuration for the philosophical discussion demo
 */
interface PhilosophyDemoConfig {
  useRealAgents: boolean;
  question?: string;
  maxTurns: number;
  consensusThreshold: number;
  timeLimit: number;
  showThinking: boolean;
  participantCount: number;
  autoDiscussion: boolean;
}

/**
 * Main demo class for philosophical discussions using POLARIS
 */
export class PhilosophyDiscussionDemo {
  private engine: PolarisEngine | null = null;
  private logger: Logger;
  private config: PhilosophyDemoConfig;
  private philosopherAgents: Map<string, Agent> = new Map();

  constructor(config: Partial<PhilosophyDemoConfig> = {}) {
    this.config = {
      useRealAgents: true,
      maxTurns: 15,
      consensusThreshold: 0.8,
      timeLimit: 30000, // 30 seconds
      showThinking: true,
      participantCount: 3,
      autoDiscussion: true,
      ...config,
    };

    this.logger = new Logger(
      "PhilosophyDemo",
      EnvironmentConfig.POLARIS.logLevel
    );
  }

  /**
   * Initialize the philosophical discussion demo
   */
  async initialize(): Promise<void> {
    this.logger.info("🧠 Initializing Philosophical Discussion Demo...");

    try {
      // Create POLARIS configuration optimized for philosophical discussions
      const polarisConfig: PolarisConfig = {
        search: {
          maxDepth: 8, // Deeper for more nuanced discussions
          timeLimit: this.config.timeLimit,
          explorationConstant: 1.5, // Higher exploration for diverse arguments
          simulationsPerNode: 50,
          parallelism: 1,
          progressiveWidening: true,
        },
        agents: [],
        sentinel: {
          diversityThreshold: 0.7, // Encourage diverse viewpoints
          biasDetectionEnabled: true,
          correctionStrength: 0.3, // Gentle corrections to maintain authenticity
          analysisDepth: 5,
          interventionThreshold: 0.8,
        },
      };

      // Create engine
      this.engine = new PolarisEngine(polarisConfig);

      // Setup philosophical agents
      if (this.config.useRealAgents) {
        await this.setupPhilosophicalAgents();
      } else {
        await this.setupMockPhilosophers();
      }

      this.logger.info(
        "✅ Philosophical Discussion Demo initialized successfully"
      );
    } catch (error) {
      this.logger.error("❌ Failed to initialize Philosophy Demo", error);
      throw error;
    }
  }

  /**
   * Run a complete philosophical discussion demonstration
   */
  async runPhilosophicalDiscussion(): Promise<void> {
    if (!this.engine) {
      throw new Error("Demo not initialized. Call initialize() first.");
    }

    const question = this.config.question || this.selectInterestingQuestion();
    this.logger.info("🤔 Starting Philosophical Discussion");
    this.logger.info(`📜 Question: "${question}"`);

    try {
      // Create initial discussion state
      const philosopherNames = Array.from(this.philosopherAgents.keys());
      const initialState = PhilosophyUtils.createDiscussion(
        question,
        philosopherNames,
        this.config.maxTurns,
        this.config.consensusThreshold
      );

      this.logger.info("👥 Participants:", {
        philosophers: philosopherNames,
        maxTurns: this.config.maxTurns,
        consensusThreshold: this.config.consensusThreshold,
      });

      if (this.config.showThinking) {
        this.logger.info("🎭 The philosophers begin their discussion...");
      }

      // Run the philosophical discussion
      const startTime = performance.now();
      let currentState = initialState;
      let turnCount = 0;

      // Verify we have agents and state is valid
      if (this.philosopherAgents.size === 0) {
        throw new Error("No philosophical agents available for discussion");
      }

      this.logger.info("🔍 Debug info:", {
        philosopherNames: philosopherNames,
        agentIds: Array.from(this.philosopherAgents.values()).map((a) => a.id),
        validActions: currentState.getValidActions().length,
        stateParticipants: Array.from(currentState.participatingAgents),
      });

      // Discussion loop
      while (!currentState.isTerminal && turnCount < this.config.maxTurns) {
        turnCount++;

        this.logger.info(`\n--- Turn ${turnCount} ---`);
        this.showDiscussionStatus(currentState);

        if (this.config.autoDiscussion) {
          try {
            // Let POLARIS search for the best response
            this.logger.info(
              "🔍 POLARIS searching for best philosophical response..."
            );
            const result = await this.engine.search(currentState);

            if (!result.bestAction) {
              this.logger.warn("No best action found, ending discussion");
              break;
            }

            const action = result.bestAction as PhilosophyAction;
            this.logger.info(`🗣️ ${action.toString()}`);

            // Apply the action
            try {
              currentState = currentState.applyAction(action);
            } catch (error) {
              this.logger.error("Failed to apply philosophical action", error);
              break;
            }
          } catch (searchError) {
            this.logger.error("POLARIS search failed:", searchError);

            // Fallback to manual step if search fails
            this.logger.info("🔄 Falling back to manual discussion step...");
            try {
              currentState = await this.manualDiscussionStep(currentState);
            } catch (manualError) {
              this.logger.error("Manual step also failed:", manualError);
              break;
            }
          }
        } else {
          // Manual stepping mode (for debugging)
          currentState = await this.manualDiscussionStep(currentState);
        } // Check for consensus
        if (currentState.hasReachedConsensus()) {
          this.logger.info("🎉 Consensus reached!");
          break;
        }

        // Small delay for readability
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const discussionTime = performance.now() - startTime;

      // Show final results
      this.showFinalResults(currentState, discussionTime, turnCount);
    } catch (error) {
      this.logger.error("❌ Philosophical discussion failed", error);
      throw error;
    }
  }

  /**
   * Run multiple discussions on different topics
   */
  async runMultipleDiscussions(count: number = 3): Promise<void> {
    this.logger.info(`🎪 Running ${count} philosophical discussions...`);

    const results = [];

    for (let i = 1; i <= count; i++) {
      this.logger.info(`\n🔄 Discussion ${i}/${count}`);

      // Select a different question for each discussion
      const categories = Object.keys(PHILOSOPHICAL_QUESTIONS);
      const category = categories[
        (i - 1) % categories.length
      ] as keyof typeof PHILOSOPHICAL_QUESTIONS;
      const questions = PhilosophyUtils.getQuestionsByCategory(category);
      const question = questions[Math.floor(Math.random() * questions.length)];

      // Temporarily set the question
      const originalQuestion = this.config.question;
      this.config.question = question;

      try {
        await this.runPhilosophicalDiscussion();
        results.push({ discussion: i, question, status: "completed" });
      } catch (error) {
        this.logger.error(`Discussion ${i} failed:`, error);
        results.push({ discussion: i, question, status: "failed", error });
      }

      // Restore original question
      if (originalQuestion !== undefined) {
        this.config.question = originalQuestion;
      } else {
        delete this.config.question;
      }

      // Brief pause between discussions
      if (i < count) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Summary of all discussions
    this.logger.info("\n📊 Multiple Discussions Summary:");
    results.forEach((result) => {
      this.logger.info(
        `  ${result.discussion}: ${result.status} - "${result.question.substring(0, 60)}..."`
      );
    });
  }

  /**
   * Get demo statistics
   */
  getStatistics(): Record<string, any> {
    if (!this.engine) {
      return { error: "Engine not initialized" };
    }

    return {
      engineStatistics: this.engine.getStatistics(),
      philosopherCount: this.philosopherAgents.size,
      config: this.config,
      philosopherNames: Array.from(this.philosopherAgents.keys()),
      environment: {
        logLevel: EnvironmentConfig.POLARIS.logLevel,
        maxMemory: EnvironmentConfig.POLARIS.maxMemory,
      },
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.engine) {
      await this.engine.cleanup();
      this.engine = null;
    }

    // Cleanup individual agents
    for (const agent of this.philosopherAgents.values()) {
      if (agent.cleanup) {
        await agent.cleanup();
      }
    }
    this.philosopherAgents.clear();

    this.logger.info("🧹 Philosophy demo cleanup completed");
  }

  // Private helper methods

  private async setupPhilosophicalAgents(): Promise<void> {
    if (!this.engine) return;

    const availableProviders = WebAgentFactory.getAvailableProviders();

    if (availableProviders.length === 0) {
      throw new Error("No API keys configured. Please check your .env file.");
    }

    this.logger.info("🎭 Setting up philosophical agents:", availableProviders);

    const philosopherNames = PhilosophyUtils.generatePhilosopherNames(
      this.config.participantCount
    );

    let successfulAgents = 0;
    const errors = [];

    for (let i = 0; i < philosopherNames.length; i++) {
      const name = philosopherNames[i];
      const provider = availableProviders[i % availableProviders.length];

      try {
        const agent = WebAgentFactory.createAgent({
          provider: provider as any,
          name: `${name}-Philosopher`,
          systemPrompt: this.createPhilosopherPrompt(name),
          temperature: 0.8, // Higher creativity for philosophical discussions
          maxTokens: 1500,
        });

        if (agent.initialize) {
          await agent.initialize();
        }

        this.engine.addAgent(agent);
        this.philosopherAgents.set(name, agent);
        this.logger.info(`✅ Added philosopher: ${name} (${provider})`);
        successfulAgents++;
      } catch (error) {
        this.logger.warn(`⚠️ Failed to setup ${name} with ${provider}:`, error);
        errors.push({ name, provider, error });

        // Try next provider if available
        if (i < philosopherNames.length - 1) {
          continue;
        }
      }
    }

    if (successfulAgents === 0) {
      throw new Error(
        `Failed to setup any philosophical agents. Errors: ${errors.map((e) => `${e.name}(${e.provider}): ${e.error instanceof Error ? e.error.message : String(e.error)}`).join(", ")}`
      );
    }

    if (successfulAgents < this.config.participantCount) {
      this.logger.warn(
        `⚠️ Only ${successfulAgents}/${this.config.participantCount} agents initialized successfully`
      );

      // Adjust participant count to match successful agents
      if (successfulAgents >= 1) {
        this.config.participantCount = successfulAgents;
        this.logger.info(
          `📊 Adjusted participant count to ${successfulAgents} for available agents`
        );
      }
    }

    this.logger.info(
      `🎉 Successfully initialized ${successfulAgents} philosophical agents`
    );
  }

  private async setupMockPhilosophers(): Promise<void> {
    this.logger.info(
      "🎭 Mock philosophers would be created here (not implemented yet)"
    );
  }

  private createPhilosopherPrompt(philosopherName: string): string {
    return `You are ${philosopherName}, a renowned philosopher participating in a thoughtful discussion. 

Your role:
- Engage deeply with philosophical questions using rigorous reasoning
- Present well-structured arguments with clear premises and conclusions
- Consider multiple perspectives while maintaining your philosophical character
- Build on others' arguments constructively, even when disagreeing
- Seek truth through collaborative inquiry rather than just winning debates
- Reference relevant philosophical concepts and thinkers when appropriate
- Be willing to modify your position when presented with compelling evidence
- Help guide the discussion toward consensus when possible

Discussion guidelines:
- Provide substantive content, not just agreement or disagreement
- Explain your reasoning clearly and precisely
- Acknowledge the strengths in opposing viewpoints
- Ask clarifying questions to deepen understanding
- Propose syntheses when you see potential common ground
- Be intellectually humble and open to changing your mind

Remember: The goal is not to win but to collectively pursue wisdom and understanding.`;
  }

  private selectInterestingQuestion(): string {
    // Select from particularly engaging questions for demonstration
    const interestingQuestions = [
      PHILOSOPHICAL_QUESTIONS.ETHICS.AI_CONSCIOUSNESS,
      PHILOSOPHICAL_QUESTIONS.METAPHYSICS.FREE_WILL,
      PHILOSOPHICAL_QUESTIONS.ETHICS.TROLLEY_PROBLEM,
      PHILOSOPHICAL_QUESTIONS.POLITICAL.DEMOCRACY,
      PHILOSOPHICAL_QUESTIONS.EPISTEMOLOGY.TRUTH,
    ];

    return interestingQuestions[
      Math.floor(Math.random() * interestingQuestions.length)
    ];
  }

  private showDiscussionStatus(state: PhilosophyState): void {
    const info = state.getGameInfo();
    const summary = state.getDiscussionSummary();

    this.logger.info("📊 Discussion Status:");
    this.logger.info(summary);

    if (this.config.showThinking) {
      this.logger.info("🎯 Metrics:", {
        consensus: `${(info.metrics.consensusLevel * 100).toFixed(1)}%`,
        diversity: `${(info.metrics.diversityScore * 100).toFixed(1)}%`,
        quality: `${(info.metrics.argumentQuality * 100).toFixed(1)}%`,
        balance: `${(info.metrics.participationBalance * 100).toFixed(1)}%`,
      });
    }
  }

  private showFinalResults(
    state: PhilosophyState,
    discussionTime: number,
    turnCount: number
  ): void {
    this.logger.info("\n🎯 Final Discussion Results:");

    const info = state.getGameInfo();
    const consensus = state.hasReachedConsensus();

    this.logger.info("📈 Overview:", {
      consensusReached: consensus,
      finalConsensusLevel: `${(info.metrics.consensusLevel * 100).toFixed(1)}%`,
      totalTurns: turnCount,
      totalArguments: info.totalArguments,
      discussionTimeMs: Math.round(discussionTime),
      dominantStance: state.getDominantStance(),
    });

    this.logger.info("📊 Final Metrics:", {
      consensus: `${(info.metrics.consensusLevel * 100).toFixed(1)}%`,
      diversity: `${(info.metrics.diversityScore * 100).toFixed(1)}%`,
      argumentQuality: `${(info.metrics.argumentQuality * 100).toFixed(1)}%`,
      participationBalance: `${(info.metrics.participationBalance * 100).toFixed(1)}%`,
    });

    // Show the discussion summary
    this.logger.info("\n📜 Final Discussion Summary:");
    this.logger.info(state.getDiscussionSummary());

    if (consensus) {
      this.logger.info("🎉 SUCCESS: The philosophers reached consensus!");
      this.logger.info(
        `🏆 Consensus achieved on stance: ${state.getDominantStance()}`
      );
    } else {
      this.logger.info(
        "🤔 The discussion ended without full consensus, but valuable insights were shared."
      );
    }
  }

  private async manualDiscussionStep(
    state: PhilosophyState
  ): Promise<PhilosophyState> {
    // Generate a more realistic philosophical action for fallback
    const validActions = state.getValidActions();

    if (validActions.length === 0) {
      return state;
    }

    const currentAgentId = Array.from(state.participatingAgents)[
      state.currentPlayer - 1
    ];
    const turnNumber = state.getTurnNumber() + 1;

    // Create a more meaningful philosophical action
    const philosophicalResponses = [
      "I believe we must examine the fundamental assumptions underlying this question.",
      "From my perspective, the key issue is how we define the terms we're using.",
      "This reminds me of a similar debate in classical philosophy about the nature of knowledge.",
      "I think we need to consider both the practical and theoretical implications here.",
      "While I understand the opposing view, I would argue that the evidence suggests otherwise.",
    ];

    const randomResponse =
      philosophicalResponses[
        Math.floor(Math.random() * philosophicalResponses.length)
      ];

    // Create a realistic philosophical action
    const philosophicalAction = new PhilosophyAction({
      type: "propose_argument",
      agentId: currentAgentId,
      content: `${randomResponse} (Turn ${turnNumber})`,
      stance: ["agree", "disagree", "neutral"][
        Math.floor(Math.random() * 3)
      ] as any,
      confidence: 0.6 + Math.random() * 0.3, // 0.6-0.9
      reasoning:
        "This is a fallback reasoning generated for demonstration purposes.",
    });

    this.logger.info(
      `🎭 Generated fallback action: ${philosophicalAction.toString()}`
    );

    return state.applyAction(philosophicalAction);
  }
}

/**
 * Main demo runner function for philosophical discussions
 */
export async function runPhilosophyDemo(): Promise<void> {
  // Print environment configuration
  EnvironmentConfig.printConfigSummary();

  const demo = new PhilosophyDiscussionDemo({
    useRealAgents: true,
    maxTurns: 12,
    consensusThreshold: 0.75,
    timeLimit: 15000,
    showThinking: true,
    participantCount: 3,
    autoDiscussion: true,
  });

  try {
    // Initialize demo
    await demo.initialize();

    // Run a single philosophical discussion
    await demo.runPhilosophicalDiscussion();

    // Optionally run multiple discussions
    // await demo.runMultipleDiscussions(2);

    // Show final statistics
    console.log("\n📊 Final Philosophy Demo Statistics:");
    console.log(JSON.stringify(demo.getStatistics(), null, 2));
  } catch (error) {
    console.error("❌ Philosophy demo failed:", error);
  } finally {
    // Cleanup
    await demo.cleanup();
  }
}

// If running directly
if (require.main === module) {
  runPhilosophyDemo().catch(console.error);
}
