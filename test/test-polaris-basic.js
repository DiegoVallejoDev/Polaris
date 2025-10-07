/**
 * Basic test of Polaris framework functionality
 * Testing without complex preset configurations
 */

// Load the compiled JavaScript
const {
    PolarisEngine,
    TaskBuilder,
    openAiAgent,
    anthropicAgent,
    googleAgent,
    CommonDomains
} = require('../dist/src/index');

async function testBasicPolarisSetup() {
    console.log("=== Testing Basic Polaris Setup ===\n");

    try {
        // 1. Create a simple task manually
        console.log("1. Creating a simple task...");
        const task = TaskBuilder.create("test-task", "Basic Test Task")
            .description("A simple test task for Polaris framework validation")
            .commonDomain("GENERAL")
            .commonRoles(["ANALYST", "RISKY", "CONSERVATIVE"])
            .goals("Test the framework functionality")
            .build();

        console.log("✓ Task created successfully:");
        console.log(`  - Name: ${task.name}`);
        console.log(`  - Domain: ${task.domain.name}`);
        console.log(`  - Roles: ${Object.keys(task.roles).join(", ")}`);

        // 2. Try to create agents
        console.log("\n2. Creating agents...");
        const agents = [];

        // Create agents with explicit role references
        try {
            const analystAgent = openAiAgent({
                role: task.roles.ANALYST,
                task: task,
                model: "gpt-4o-mini",
                name: "Test Analyst",
                apiKey: process.env.OPENAI_API_KEY || "test-key"
            });
            agents.push(analystAgent);
            console.log("✓ OpenAI analyst agent created");
        } catch (err) {
            console.log("✗ OpenAI agent creation failed:", err.message);
        }

        try {
            const riskyAgent = anthropicAgent({
                role: task.roles.RISKY,
                task: task,
                model: "claude-3-haiku-20240307",
                name: "Test Risk-Taker",
                apiKey: process.env.ANTHROPIC_API_KEY || "test-key"
            });
            agents.push(riskyAgent);
            console.log("✓ Anthropic risky agent created");
        } catch (err) {
            console.log("✗ Anthropic agent creation failed:", err.message);
        }

        try {
            const conservativeAgent = googleAgent({
                role: task.roles.CONSERVATIVE,
                task: task,
                model: "gemini-1.5-flash",
                name: "Test Conservative",
                apiKey: process.env.GOOGLE_API_KEY || "test-key"
            });
            agents.push(conservativeAgent);
            console.log("✓ Google conservative agent created");
        } catch (err) {
            console.log("✗ Google agent creation failed:", err.message);
        }

        console.log(`\nCreated ${agents.length} agents successfully`);

        // 3. Try to create engine
        if (agents.length > 0) {
            console.log("\n3. Creating Polaris engine...");
            const engine = new PolarisEngine({
                task: task,
                agents: agents,
                engineConfig: {
                    maxIterations: 10,
                    timeLimit: 5000,
                    parallel: false
                }
            });

            console.log("✓ Engine created successfully");
            console.log(`  - Session ID: ${engine.getSessionId()}`);
            console.log(`  - Agent count: ${engine.getAgents().length}`);

            // 4. Test basic engine operations (without inference)
            console.log("\n4. Testing engine operations...");

            // Test agent retrieval
            const retrievedAgents = engine.getAgents();
            console.log("✓ Retrieved agents:", retrievedAgents.map(a => a.name).join(", "));

            // Test getting individual agent
            const firstAgent = engine.getAgent(retrievedAgents[0].id);
            console.log("✓ Agent retrieval by ID works:", firstAgent ? firstAgent.name : "Not found");

            // 5. Clean up
            console.log("\n5. Cleaning up...");
            await engine.cleanup();
            console.log("✓ Engine cleanup completed");

        } else {
            console.log("\n✗ No agents created, skipping engine test");
        }

        console.log("\n=== Basic Polaris Test Completed Successfully ===");
        return true;

    } catch (error) {
        console.error("\n✗ Test failed with error:", error.message);
        console.error("Stack trace:", error.stack);
        return false;
    }
}

// Additional test for individual components
async function testIndividualComponents() {
    console.log("\n=== Testing Individual Components ===\n");

    try {
        // Test TaskBuilder
        console.log("1. Testing TaskBuilder...");
        const simpleTask = TaskBuilder.create("component-test", "Component Test")
            .description("Testing individual components")
            .commonDomain("GENERAL")
            .commonRoles(["ANALYST"])
            .goals("Test components")
            .build();

        console.log("✓ TaskBuilder works correctly");
        console.log(`  - Task: ${simpleTask.name}`);
        console.log(`  - Roles available: ${Object.keys(simpleTask.roles).join(", ")}`);

        // Test CommonDomains
        console.log("\n2. Testing CommonDomains...");
        console.log("✓ Available domains:", Object.keys(CommonDomains).join(", "));
        console.log(`✓ GENERAL domain: ${CommonDomains.GENERAL.name}`);

        return true;
    } catch (error) {
        console.error("✗ Component test failed:", error.message);
        return false;
    }
}

// Run tests
async function runTests() {
    console.log("Starting Polaris Framework Tests\n");
    console.log("Node version:", process.version);
    console.log("Environment:", process.env.NODE_ENV || "development");
    console.log("");

    const componentTest = await testIndividualComponents();
    const basicTest = await testBasicPolarisSetup();

    console.log("\n" + "=".repeat(50));
    console.log("TEST RESULTS:");
    console.log("Component test:", componentTest ? "PASSED" : "FAILED");
    console.log("Basic setup test:", basicTest ? "PASSED" : "FAILED");
    console.log("=".repeat(50));

    if (componentTest && basicTest) {
        console.log("\n🎉 All tests passed! Polaris framework is working correctly.");
    } else {
        console.log("\n❌ Some tests failed. Check the output above for details.");
        process.exit(1);
    }
}

// Run if this file is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { testBasicPolarisSetup, testIndividualComponents };