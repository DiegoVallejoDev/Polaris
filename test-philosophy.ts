/**
 * Quick test to verify philosophy demo can initialize
 */

import { PhilosophyDiscussionDemo } from "./src/demo/philosophy-demo";
import {
  PhilosophyUtils,
  PHILOSOPHICAL_QUESTIONS,
} from "./src/domains/philosophy";

async function testPhilosophyDemo() {
  console.log("🧪 Testing Philosophy Demo Initialization...\n");

  try {
    // Test 1: Basic demo creation
    console.log("✅ Test 1: Creating demo instance...");
    const demo = new PhilosophyDiscussionDemo({
      useRealAgents: false, // Use mock agents for testing
      maxTurns: 5,
      consensusThreshold: 0.7,
      participantCount: 2,
      autoDiscussion: true,
    });
    console.log("✅ Demo instance created successfully");

    // Test 2: Philosophy utilities
    console.log("✅ Test 2: Testing philosophy utilities...");
    const randomQuestion = PhilosophyUtils.getRandomQuestion();
    console.log(`Random question: "${randomQuestion.substring(0, 60)}..."`);

    const philosopherNames = PhilosophyUtils.generatePhilosopherNames(3);
    console.log(`Generated philosophers: ${philosopherNames.join(", ")}`);

    const ethicsQuestions = PhilosophyUtils.getQuestionsByCategory("ETHICS");
    console.log(`Ethics questions count: ${ethicsQuestions.length}`);

    // Test 3: Discussion state creation
    console.log("✅ Test 3: Testing discussion state creation...");
    const discussion = PhilosophyUtils.createDiscussion(
      PHILOSOPHICAL_QUESTIONS.ETHICS.AI_CONSCIOUSNESS,
      ["Socrates", "Kant", "Nietzsche"],
      10,
      0.8
    );

    console.log("Discussion created:", {
      question: discussion.question.substring(0, 60) + "...",
      participants: Array.from(discussion.participatingAgents),
      maxTurns: discussion.maxTurns,
      consensusThreshold: discussion.consensusThreshold,
    });

    // Test 4: Basic state operations
    console.log("✅ Test 4: Testing state operations...");
    const validActions = discussion.getValidActions();
    console.log(`Valid actions available: ${validActions.length}`);

    const features = discussion.getFeatures();
    console.log(`Feature vector length: ${features.length}`);

    const summary = discussion.getDiscussionSummary();
    console.log(`Discussion summary generated (${summary.length} chars)`);

    // Test 5: Statistics
    console.log("✅ Test 5: Testing statistics...");
    const stats = demo.getStatistics();
    console.log(
      `Statistics collected: ${Object.keys(stats).length} properties`
    );

    console.log("\n🎉 All tests passed! Philosophy demo is ready to use.");
    console.log("\nTo run the full demo with real agents:");
    console.log("  npm run demo:philosophy");
    console.log("  npm run demo:philosophy:specific");
    console.log("  npm run demo:philosophy:multiple");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  testPhilosophyDemo().catch(console.error);
}

export { testPhilosophyDemo };
