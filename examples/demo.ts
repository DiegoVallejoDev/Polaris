/**
 * POLARIS Demo
 * Simple demonstration of the framework
 */

async function demo() {
  console.log("🌟 POLARIS Framework Demo\n");

  console.log("This is a simplified multi-agent decision-making framework.");
  console.log("It uses Monte Carlo Tree Search with AI agent evaluations.\n");

  // Just run the agent test for now
  const testModule = await import("../test-agents");
  await testModule.testAgents();

  console.log("\n📖 Learn more: https://github.com/DiegoVallejoDev/Polaris");
}

if (require.main === module) {
  demo().catch(console.error);
}
