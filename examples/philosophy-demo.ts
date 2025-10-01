/**
 * Philosophy Demo Example - Simple runner for the philosophical discussion demo
 */

import {
  runPhilosophyDemo,
  PhilosophyDiscussionDemo,
} from "../src/demo/philosophy-demo";
import { PHILOSOPHICAL_QUESTIONS } from "../src/domains/philosophy";

/**
 * Run a specific philosophical question
 */
async function runSpecificQuestion() {
  console.log("🧠 Running Philosophy Demo with Specific Question\n");

  const demo = new PhilosophyDiscussionDemo({
    useRealAgents: true,
    question: PHILOSOPHICAL_QUESTIONS.ETHICS.AI_CONSCIOUSNESS,
    maxTurns: 10,
    consensusThreshold: 0.75,
    timeLimit: 20000,
    showThinking: true,
    participantCount: 3,
    autoDiscussion: true,
  });

  try {
    await demo.initialize();
    await demo.runPhilosophicalDiscussion();
  } catch (error) {
    console.error("Demo failed:", error);
  } finally {
    await demo.cleanup();
  }
}

/**
 * Run multiple discussions on different topics
 */
async function runMultipleTopics() {
  console.log("🎪 Running Multiple Philosophy Discussions\n");

  const demo = new PhilosophyDiscussionDemo({
    useRealAgents: true,
    maxTurns: 8,
    consensusThreshold: 0.7,
    timeLimit: 15000,
    showThinking: true,
    participantCount: 3,
    autoDiscussion: true,
  });

  try {
    await demo.initialize();
    await demo.runMultipleDiscussions(3);
  } catch (error) {
    console.error("Demo failed:", error);
  } finally {
    await demo.cleanup();
  }
}

/**
 * Main execution
 */
async function main() {
  console.log("🎭 POLARIS Philosophy Discussion Demo Examples\n");

  const args = process.argv.slice(2);
  const mode = args[0] || "default";

  switch (mode) {
    case "specific":
      await runSpecificQuestion();
      break;
    case "multiple":
      await runMultipleTopics();
      break;
    case "default":
    default:
      await runPhilosophyDemo();
      break;
  }

  console.log("\n✨ Philosophy demo completed!");
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as runPhilosophyExamples };
