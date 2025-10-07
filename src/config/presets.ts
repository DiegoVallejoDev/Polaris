/**
 * Configuration presets for common POLARIS use cases
 */

import { PolarisEngineTask, CommonRoles, TaskBuilder } from "../types/task";
import { AgentProvider } from "../agents/factories/agent-factory";

/**
 * Engine configuration preset
 */
export interface EnginePreset {
  /** Preset identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description of the preset */
  description: string;

  /** Task configuration */
  task: PolarisEngineTask;

  /** Recommended agent configurations */
  agents: Array<{
    provider: AgentProvider;
    model: string;
    roleId: string;
    name?: string;
    maxTokens?: number;
    temperature?: number;
  }>;

  /** Engine configuration */
  engineConfig?: {
    maxIterations?: number;
    timeLimit?: number;
    diversityThreshold?: number;
    consensusThreshold?: number;
  };

  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Built-in configuration presets
 */
export const ConfigurationPresets: Record<string, EnginePreset> = {
  CHESS_ANALYSIS: {
    id: "chess-analysis",
    name: "Chess Position Analysis",
    description:
      "Multi-agent chess position evaluation with diverse perspectives",
    task: TaskBuilder.create("chess-analysis", "Chess Position Analysis")
      .description(
        "Comprehensive chess position evaluation using multiple analytical perspectives"
      )
      .commonDomain("CHESS")
      .commonRoles(["ANALYST", "RISKY", "CONSERVATIVE", "QUESTIONING"])
      .goals(
        "Evaluate chess positions accurately and provide actionable insights",
        [
          "Identify tactical opportunities",
          "Assess strategic elements",
          "Evaluate risk vs reward",
        ],
        [
          "Consistent scoring methodology",
          "Clear reasoning",
          "Actionable recommendations",
        ]
      )
      .config({
        evaluationCriteria: [
          "material",
          "king_safety",
          "piece_activity",
          "pawn_structure",
        ],
        scoringMethod: "consensus",
      })
      .build(),
    agents: [
      {
        provider: AgentProvider.OPENAI,
        model: "gpt-4o",
        roleId: "analyst",
        name: "Strategic Analyst",
      },
      {
        provider: AgentProvider.ANTHROPIC,
        model: "claude-3-5-sonnet-20241022",
        roleId: "risky",
        name: "Tactical Aggressor",
      },
      {
        provider: AgentProvider.GOOGLE,
        model: "gemini-1.5-pro",
        roleId: "conservative",
        name: "Positional Guardian",
      },
      {
        provider: AgentProvider.OPENAI,
        model: "gpt-4o-mini",
        roleId: "questioning",
        name: "Critical Reviewer",
        maxTokens: 800,
      },
    ],
    engineConfig: {
      maxIterations: 100,
      timeLimit: 30000,
      diversityThreshold: 0.3,
      consensusThreshold: 0.7,
    },
  },

  PHILOSOPHICAL_DEBATE: {
    id: "philosophical-debate",
    name: "Philosophical Argumentation",
    description: "Multi-perspective philosophical analysis and argumentation",
    task: TaskBuilder.create(
      "philosophical-debate",
      "Philosophical Argumentation"
    )
      .description(
        "Structured philosophical reasoning and debate on complex topics"
      )
      .commonDomain("DEBATE")
      .commonRoles(["ANALYST", "RISKY", "QUESTIONING", "EXPLORER"])
      .goals(
        "Provide comprehensive philosophical analysis from multiple perspectives",
        [
          "Explore different philosophical traditions",
          "Identify logical arguments",
          "Challenge assumptions",
        ],
        [
          "Well-reasoned arguments",
          "Multiple perspectives represented",
          "Logical consistency",
        ]
      )
      .config({
        evaluationCriteria: [
          "logical_consistency",
          "argument_strength",
          "perspective_diversity",
        ],
        scoringMethod: "collaborative",
      })
      .build(),
    agents: [
      {
        provider: AgentProvider.ANTHROPIC,
        model: "claude-3-5-sonnet-20241022",
        roleId: "analyst",
        name: "Systematic Philosopher",
        maxTokens: 1500,
      },
      {
        provider: AgentProvider.OPENAI,
        model: "gpt-4o",
        roleId: "risky",
        name: "Radical Thinker",
        temperature: 0.8,
      },
      {
        provider: AgentProvider.GOOGLE,
        model: "gemini-1.5-pro",
        roleId: "questioning",
        name: "Socratic Questioner",
      },
      {
        provider: AgentProvider.ANTHROPIC,
        model: "claude-3-haiku-20240307",
        roleId: "explorer",
        name: "Creative Explorer",
        temperature: 0.9,
      },
    ],
    engineConfig: {
      maxIterations: 150,
      timeLimit: 60000,
      diversityThreshold: 0.4,
      consensusThreshold: 0.6,
    },
  },

  QUICK_START: {
    id: "quick-start",
    name: "Quick Start Configuration",
    description: "Simple configuration for getting started with POLARIS",
    task: TaskBuilder.create("quick-start", "General Problem Solving")
      .description("General-purpose problem analysis and decision making")
      .commonDomain("GENERAL")
      .commonRoles(["ANALYST", "RISKY"])
      .goals(
        "Provide balanced analysis and recommendations",
        ["Consider multiple factors", "Identify opportunities and risks"],
        ["Clear reasoning", "Actionable insights"]
      )
      .build(),
    agents: [
      {
        provider: AgentProvider.OPENAI,
        model: "gpt-4o-mini",
        roleId: "analyst",
        name: "Primary Analyst",
      },
      {
        provider: AgentProvider.ANTHROPIC,
        model: "claude-3-haiku-20240307",
        roleId: "risky",
        name: "Alternative Perspective",
      },
    ],
    engineConfig: {
      maxIterations: 50,
      timeLimit: 15000,
      diversityThreshold: 0.2,
      consensusThreshold: 0.8,
    },
  },

  COMPETITIVE_ANALYSIS: {
    id: "competitive-analysis",
    name: "Competitive Game Analysis",
    description: "Multi-agent analysis for competitive gaming scenarios",
    task: TaskBuilder.create(
      "competitive-analysis",
      "Competitive Strategy Analysis"
    )
      .description(
        "Strategic analysis for competitive environments with focus on opponent modeling"
      )
      .commonDomain("GENERAL")
      .commonRoles(["ANALYST", "RISKY", "CONSERVATIVE", "EXPLORER"])
      .goals(
        "Develop winning strategies through comprehensive competitive analysis",
        [
          "Model opponent behavior",
          "Identify strategic advantages",
          "Minimize risk exposure",
        ],
        ["Actionable strategy", "Risk assessment", "Adaptive planning"]
      )
      .config({
        evaluationCriteria: [
          "strategic_advantage",
          "risk_assessment",
          "adaptability",
        ],
        scoringMethod: "competitive",
      })
      .build(),
    agents: [
      {
        provider: AgentProvider.OPENAI,
        model: "gpt-4o",
        roleId: "analyst",
        name: "Strategy Analyst",
        maxTokens: 1200,
      },
      {
        provider: AgentProvider.ANTHROPIC,
        model: "claude-3-5-sonnet-20241022",
        roleId: "risky",
        name: "Aggressive Strategist",
      },
      {
        provider: AgentProvider.GOOGLE,
        model: "gemini-1.5-pro",
        roleId: "conservative",
        name: "Defensive Planner",
      },
      {
        provider: AgentProvider.OPENAI,
        model: "gpt-4o-mini",
        roleId: "explorer",
        name: "Innovation Scout",
        temperature: 0.8,
      },
    ],
    engineConfig: {
      maxIterations: 120,
      timeLimit: 45000,
      diversityThreshold: 0.35,
      consensusThreshold: 0.65,
    },
  },

  HIGH_STAKES_DECISION: {
    id: "high-stakes-decision",
    name: "High-Stakes Decision Making",
    description:
      "Comprehensive analysis for critical decisions with multiple expert perspectives",
    task: TaskBuilder.create(
      "high-stakes-decision",
      "Critical Decision Analysis"
    )
      .description(
        "Multi-faceted analysis for high-impact decisions requiring careful consideration"
      )
      .commonDomain("GENERAL")
      .roles({
        analyst: CommonRoles.ANALYST,
        conservative: CommonRoles.CONSERVATIVE,
        questioning: CommonRoles.QUESTIONING,
        explorer: CommonRoles.EXPLORER,
        risk_assessor: {
          id: "risk-assessor",
          name: "Risk Assessor",
          goal: "Identify and quantify potential risks and downsides",
          instructions:
            "Focus on potential negative outcomes, failure modes, and risk mitigation strategies. Be thorough in identifying what could go wrong.",
          perspective: "risk-focused-analytical",
          bias: "conservative",
        },
      })
      .goals(
        "Make well-informed high-stakes decisions with comprehensive risk assessment",
        [
          "Identify all potential outcomes",
          "Quantify risks and benefits",
          "Develop contingency plans",
        ],
        [
          "Thorough risk analysis",
          "Multiple perspective coverage",
          "Clear decision framework",
        ]
      )
      .config({
        evaluationCriteria: [
          "comprehensive_analysis",
          "risk_coverage",
          "decision_clarity",
        ],
        scoringMethod: "consensus",
      })
      .build(),
    agents: [
      {
        provider: AgentProvider.OPENAI,
        model: "gpt-4o",
        roleId: "analyst",
        name: "Lead Analyst",
        maxTokens: 1500,
      },
      {
        provider: AgentProvider.ANTHROPIC,
        model: "claude-3-5-sonnet-20241022",
        roleId: "conservative",
        name: "Conservative Advisor",
        maxTokens: 1500,
      },
      {
        provider: AgentProvider.GOOGLE,
        model: "gemini-1.5-pro",
        roleId: "questioning",
        name: "Devil's Advocate",
        maxTokens: 1200,
      },
      {
        provider: AgentProvider.ANTHROPIC,
        model: "claude-3-5-sonnet-20241022",
        roleId: "explorer",
        name: "Innovation Advocate",
        temperature: 0.8,
      },
      {
        provider: AgentProvider.OPENAI,
        model: "gpt-4o",
        roleId: "risk_assessor",
        name: "Risk Analyst",
        temperature: 0.3,
      },
    ],
    engineConfig: {
      maxIterations: 200,
      timeLimit: 90000,
      diversityThreshold: 0.4,
      consensusThreshold: 0.75,
    },
  },
};

/**
 * Preset categories for organization
 */
export const PresetCategories = {
  GAMING: ["chess-analysis", "competitive-analysis"],
  REASONING: ["philosophical-debate", "high-stakes-decision"],
  GENERAL: ["quick-start"],
  ADVANCED: ["high-stakes-decision", "competitive-analysis"],
} as const;

/**
 * Preset loader utility
 */
export class PresetLoader {
  /**
   * Get a preset by ID
   */
  static getPreset(presetId: string): EnginePreset | null {
    return ConfigurationPresets[presetId] || null;
  }

  /**
   * Get all available presets
   */
  static getAllPresets(): EnginePreset[] {
    return Object.values(ConfigurationPresets);
  }

  /**
   * Get presets by category
   */
  static getPresetsByCategory(
    category: keyof typeof PresetCategories
  ): EnginePreset[] {
    const presetIds = PresetCategories[category];
    return presetIds.map((id) => ConfigurationPresets[id]).filter(Boolean);
  }

  /**
   * Search presets by name or description
   */
  static searchPresets(query: string): EnginePreset[] {
    const lowerQuery = query.toLowerCase();
    return Object.values(ConfigurationPresets).filter(
      (preset) =>
        preset.name.toLowerCase().includes(lowerQuery) ||
        preset.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Create a custom preset based on an existing one
   */
  static createCustomPreset(
    basePresetId: string,
    customizations: Partial<EnginePreset>,
    newId: string
  ): EnginePreset | null {
    const basePreset = this.getPreset(basePresetId);
    if (!basePreset) {
      return null;
    }

    return {
      ...basePreset,
      ...customizations,
      id: newId,
      name: customizations.name || `Custom ${basePreset.name}`,
      description:
        customizations.description ||
        `Customized version of ${basePreset.name}`,
    };
  }

  /**
   * Validate preset configuration
   */
  static validatePreset(preset: EnginePreset): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!preset.id) errors.push("Preset must have an ID");
    if (!preset.name) errors.push("Preset must have a name");
    if (!preset.task) errors.push("Preset must have a task configuration");
    if (!preset.agents || preset.agents.length === 0)
      errors.push("Preset must have at least one agent configuration");

    // Validate task
    if (preset.task) {
      if (!preset.task.roles || Object.keys(preset.task.roles).length === 0) {
        errors.push("Task must have at least one role defined");
      }
      if (!preset.task.goals) {
        errors.push("Task must have goals defined");
      }
    }

    // Validate agents reference valid roles
    if (preset.task && preset.agents) {
      const availableRoles = Object.keys(preset.task.roles);
      for (const agent of preset.agents) {
        if (!availableRoles.includes(agent.roleId)) {
          errors.push(`Agent references undefined role: ${agent.roleId}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get preset recommendations based on use case
   */
  static getRecommendations(useCase: string): EnginePreset[] {
    const lowerUseCase = useCase.toLowerCase();

    if (lowerUseCase.includes("chess") || lowerUseCase.includes("game")) {
      return [
        ConfigurationPresets.CHESS_ANALYSIS,
        ConfigurationPresets.COMPETITIVE_ANALYSIS,
      ];
    }

    if (
      lowerUseCase.includes("philosoph") ||
      lowerUseCase.includes("debate") ||
      lowerUseCase.includes("argument")
    ) {
      return [ConfigurationPresets.PHILOSOPHICAL_DEBATE];
    }

    if (
      lowerUseCase.includes("decision") ||
      lowerUseCase.includes("critical") ||
      lowerUseCase.includes("important")
    ) {
      return [ConfigurationPresets.HIGH_STAKES_DECISION];
    }

    if (
      lowerUseCase.includes("quick") ||
      lowerUseCase.includes("start") ||
      lowerUseCase.includes("simple")
    ) {
      return [ConfigurationPresets.QUICK_START];
    }

    // Default recommendations
    return [
      ConfigurationPresets.QUICK_START,
      ConfigurationPresets.CHESS_ANALYSIS,
    ];
  }
}

/**
 * Export utilities
 */
export { ConfigurationPresets as Presets };
export default PresetLoader;
