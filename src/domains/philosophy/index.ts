/**
 * Philosophy domain - exports for philosophical discussion framework
 */

export {
  PhilosophyAction,
  PhilosophyActionFactory,
  type PhilosophyActionData,
  type PhilosophicalStance,
  type PhilosophyActionType,
} from "./philosophy-action";
export {
  PhilosophyState,
  type Argument,
  type DiscussionMetrics,
} from "./philosophy-state";

// Import for internal use
import { PhilosophyState } from "./philosophy-state";

/**
 * Common philosophical questions for testing and demos
 */
export const PHILOSOPHICAL_QUESTIONS = {
  ETHICS: {
    TROLLEY_PROBLEM:
      "Is it morally permissible to divert a runaway trolley to kill one person instead of five?",
    ANIMAL_RIGHTS:
      "Do animals have moral rights that should be protected by law?",
    AI_CONSCIOUSNESS:
      "If an AI system exhibits signs of consciousness, would it deserve moral consideration?",
    UNIVERSAL_BASIC_INCOME:
      "Should society implement a universal basic income to ensure everyone's basic needs are met?",
  },
  METAPHYSICS: {
    FREE_WILL:
      "Do humans possess genuine free will, or are all our actions determined by prior causes?",
    CONSCIOUSNESS:
      "What is the relationship between the mind and the physical brain?",
    IDENTITY:
      "What makes you 'you' - is personal identity based on memory, body, soul, or something else?",
    REALITY:
      "Is the external world real, or could we be living in a simulation or illusion?",
  },
  EPISTEMOLOGY: {
    KNOWLEDGE:
      "What constitutes genuine knowledge - must it be certain, or is justified belief sufficient?",
    SKEPTICISM:
      "How can we know anything for certain given the possibility of deception or error?",
    TRUTH:
      "Is truth objective and universal, or is it relative to individuals or cultures?",
    SCIENTIFIC_METHOD:
      "Is the scientific method the best way to understand reality?",
  },
  POLITICAL: {
    JUSTICE:
      "What constitutes a just society - should resources be distributed equally or based on merit?",
    DEMOCRACY:
      "Is democracy the best form of government, even when the majority makes poor decisions?",
    AUTHORITY:
      "What gives governments the right to exercise authority over individuals?",
    GLOBALIZATION:
      "Should we prioritize global cooperation or national sovereignty in addressing world problems?",
  },
};

/**
 * Utility functions for philosophy domain
 */
export class PhilosophyUtils {
  /**
   * Get a random philosophical question from the collection
   */
  static getRandomQuestion(): string {
    const categories = Object.values(PHILOSOPHICAL_QUESTIONS);
    const randomCategory =
      categories[Math.floor(Math.random() * categories.length)];
    const questions = Object.values(randomCategory);
    return questions[Math.floor(Math.random() * questions.length)];
  }

  /**
   * Get questions by category
   */
  static getQuestionsByCategory(
    category: keyof typeof PHILOSOPHICAL_QUESTIONS
  ): string[] {
    return Object.values(PHILOSOPHICAL_QUESTIONS[category]);
  }

  /**
   * Create agent names suitable for philosophical discussion
   */
  static generatePhilosopherNames(count: number): string[] {
    const philosophers = [
      "Socrates",
      "Plato",
      "Aristotle",
      "Kant",
      "Hume",
      "Descartes",
      "Spinoza",
      "Nietzsche",
      "Wittgenstein",
      "Russell",
      "Sartre",
      "Beauvoir",
      "Rawls",
      "Nozick",
      "Singer",
      "Dennett",
      "Nagel",
      "Chalmers",
    ];

    const selected = [];
    const shuffled = [...philosophers].sort(() => Math.random() - 0.5);

    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      selected.push(shuffled[i]);
    }

    return selected;
  }

  /**
   * Create a philosophy discussion state with sensible defaults
   */
  static createDiscussion(
    question?: string,
    agentNames?: string[],
    maxTurns: number = 20,
    consensusThreshold: number = 0.8
  ) {
    const finalQuestion = question || this.getRandomQuestion();
    const finalAgentNames = agentNames || this.generatePhilosopherNames(3);

    return PhilosophyState.createInitialState(
      finalQuestion,
      finalAgentNames,
      maxTurns,
      consensusThreshold
    );
  }
}
