/**
 * Task template and role interfaces for POLARIS agents
 */

/**
 * Agent role definition with behavioral strategy and perspective
 */
export interface AgentRole {
  /** Role identifier */
  id: string;

  /** Human-readable role name */
  name: string;

  /** Goal/objective of this role */
  goal: string;

  /** Behavioral instructions for the agent */
  instructions: string;

  /** Perspective or viewpoint this role should take */
  perspective?: string;

  /** Bias type for this role */
  bias?:
    | "aggressive"
    | "conservative"
    | "balanced"
    | "exploratory"
    | "exploitative";

  /** Additional role-specific parameters */
  parameters?: Record<string, any>;
}

/**
 * Domain configuration defining the problem area and rules
 */
export interface DomainConfig {
  /** Domain identifier */
  id: string;

  /** Human-readable domain name */
  name: string;

  /** Domain description */
  description: string;

  /** Domain-specific rules and constraints */
  rules: Record<string, any>;

  /** State representation format */
  stateFormat?: "json" | "text" | "custom";

  /** Action representation format */
  actionFormat?: "json" | "text" | "custom";

  /** Additional domain-specific configuration */
  metadata?: Record<string, any>;
}

/**
 * Main task template that defines the problem, roles, goals, and configuration
 */
export interface PolarisEngineTask {
  /** Unique task identifier */
  id: string;

  /** Human-readable task name */
  name: string;

  /** Detailed task description */
  description: string;

  /** Domain this task operates in */
  domain: DomainConfig;

  /** Available roles for agents in this task */
  roles: Record<string, AgentRole>;

  /** Task-specific goals and objectives */
  goals: {
    /** Primary objective */
    primary: string;

    /** Secondary objectives */
    secondary?: string[];

    /** Success criteria */
    successCriteria?: string[];
  };

  /** Constraints and limitations */
  constraints?: {
    /** Time limits */
    timeLimit?: number;

    /** Resource limits */
    resourceLimits?: Record<string, number>;

    /** Other constraints */
    other?: string[];
  };

  /** Task-specific configuration */
  config?: {
    /** Evaluation criteria */
    evaluationCriteria?: string[];

    /** Scoring methodology */
    scoringMethod?: "competitive" | "collaborative" | "consensus";

    /** Additional task parameters */
    parameters?: Record<string, any>;
  };

  /** Additional task metadata */
  metadata?: Record<string, any>;
}

/**
 * Built-in common roles
 */
export const CommonRoles: Record<string, AgentRole> = {
  ANALYST: {
    id: "analyst",
    name: "Analyst",
    goal: "Provide objective analysis and evaluation",
    instructions:
      "Analyze the situation objectively, considering all available data and providing balanced assessments.",
    perspective: "neutral-analytical",
    bias: "balanced",
  },

  RISKY: {
    id: "risky",
    name: "Risk-Taker",
    goal: "Explore high-risk, high-reward options",
    instructions:
      "Look for bold moves and unconventional strategies that could lead to significant advantages.",
    perspective: "aggressive-opportunistic",
    bias: "aggressive",
  },

  CONSERVATIVE: {
    id: "conservative",
    name: "Conservative",
    goal: "Minimize risk and maintain stability",
    instructions:
      "Focus on safe, proven strategies that minimize potential losses and maintain current advantages.",
    perspective: "cautious-defensive",
    bias: "conservative",
  },

  EXPLORER: {
    id: "explorer",
    name: "Explorer",
    goal: "Discover new possibilities and patterns",
    instructions:
      "Seek out unexplored options and novel approaches, prioritizing learning and discovery.",
    perspective: "curious-experimental",
    bias: "exploratory",
  },

  QUESTIONING: {
    id: "questioning",
    name: "Skeptical Questioner",
    goal: "Challenge assumptions and find flaws",
    instructions:
      "Question all assumptions, look for potential problems, and challenge conventional wisdom.",
    perspective: "critical-skeptical",
    bias: "balanced",
  },
};

/**
 * Built-in common domains
 */
export const CommonDomains: Record<string, DomainConfig> = {
  CHESS: {
    id: "chess",
    name: "Chess",
    description: "Strategic board game with perfect information",
    rules: {
      gameType: "turn-based",
      players: 2,
      perfectInformation: true,
      deterministicActions: true,
    },
    stateFormat: "json",
    actionFormat: "json",
  },

  DEBATE: {
    id: "debate",
    name: "Philosophical Debate",
    description: "Structured argumentation and reasoning",
    rules: {
      gameType: "turn-based",
      players: "multiple",
      perfectInformation: false,
      subjectiveEvaluation: true,
    },
    stateFormat: "text",
    actionFormat: "text",
  },

  GENERAL: {
    id: "general",
    name: "General Problem Solving",
    description: "Generic problem-solving domain",
    rules: {
      gameType: "flexible",
      constraints: "minimal",
    },
    stateFormat: "json",
    actionFormat: "json",
  },
};

/**
 * Task builder utility for creating tasks
 */
export class TaskBuilder {
  private task: Partial<PolarisEngineTask> = {};

  static create(id: string, name: string): TaskBuilder {
    const builder = new TaskBuilder();
    builder.task.id = id;
    builder.task.name = name;
    return builder;
  }

  description(description: string): TaskBuilder {
    this.task.description = description;
    return this;
  }

  domain(domain: DomainConfig): TaskBuilder {
    this.task.domain = domain;
    return this;
  }

  commonDomain(domainKey: keyof typeof CommonDomains): TaskBuilder {
    this.task.domain = CommonDomains[domainKey];
    return this;
  }

  roles(roles: Record<string, AgentRole>): TaskBuilder {
    this.task.roles = roles;
    return this;
  }

  commonRoles(roleKeys: (keyof typeof CommonRoles)[]): TaskBuilder {
    this.task.roles = {};
    for (const key of roleKeys) {
      this.task.roles[key] = CommonRoles[key];
    }
    return this;
  }

  goals(
    primary: string,
    secondary?: string[],
    successCriteria?: string[]
  ): TaskBuilder {
    const goals: any = { primary };
    if (secondary !== undefined) goals.secondary = secondary;
    if (successCriteria !== undefined) goals.successCriteria = successCriteria;
    this.task.goals = goals;
    return this;
  }

  constraints(constraints: PolarisEngineTask["constraints"]): TaskBuilder {
    if (constraints !== undefined) {
      this.task.constraints = constraints;
    }
    return this;
  }

  config(config: PolarisEngineTask["config"]): TaskBuilder {
    if (config !== undefined) {
      this.task.config = config;
    }
    return this;
  }

  metadata(metadata: Record<string, any>): TaskBuilder {
    this.task.metadata = metadata;
    return this;
  }

  build(): PolarisEngineTask {
    // Validate required fields
    if (!this.task.id || !this.task.name || !this.task.description) {
      throw new Error("Task must have id, name, and description");
    }

    if (!this.task.domain) {
      throw new Error("Task must have a domain");
    }

    if (!this.task.roles || Object.keys(this.task.roles).length === 0) {
      throw new Error("Task must have at least one role");
    }

    if (!this.task.goals) {
      throw new Error("Task must have goals defined");
    }

    return this.task as PolarisEngineTask;
  }
}
