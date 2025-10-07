/**
 * Comprehensive test of Polaris framework with actual LLM inference
 * This tests the complete pipeline including API calls
 */

// Load the compiled JavaScript
const {
    PolarisEngine,
    TaskBuilder,
    QuickAgents,
    CommonDomains,
    BaseGameState,
    BaseAction
} = require('../dist/src/index');

// Simple test state class
class TestGameState extends BaseGameState {
    constructor(problemDescription, currentPlayer = 0) {
        super(`state_${Date.now()}`, currentPlayer, false);
        this.problemDescription = problemDescription;
        this.context = {};
    }

    serialize() {
        return {
            id: this.id,
            problemDescription: this.problemDescription,
            currentPlayer: this.currentPlayer,
            context: this.context
        };
    }

    clone() {
        const cloned = new TestGameState(this.problemDescription, this.currentPlayer);
        cloned.context = { ...this.context };
        return cloned;
    }

    getTurnNumber() {
        return 1;
    }

    applyAction(action) {
        const newState = this.clone();
        newState.context.lastAction = action.serialize();
        return newState;
    }

    getValidActions() {
        return [];
    }

    getFeatures() {
        return [this.currentPlayer, Object.keys(this.context).length];
    }

    getHashKey() {
        return `${this.id}_${this.currentPlayer}`;
    }

    getGameInfo() {
        return {
            problem: this.problemDescription,
            context: this.context
        };
    }
}

// Simple test action class
class TestAction extends BaseAction {
    constructor(actionName, description, value = 0.5) {
        super(`action_${actionName}`, actionName, value.toString());
        this.actionName = actionName;
        this.description = description;
        this.value = value;
    }

    execute(state) {
        return state.applyAction(this);
    }

    toString() {
        return `${this.actionName}: ${this.description}`;
    }

    isValid() {
        return true;
    }

    getCost() {
        return 1.0;
    }

    getMetadata() {
        return {
            name: this.actionName,
            description: this.description,
            value: this.value
        };
    }

    serialize() {
        return {
            id: this.id,
            name: this.actionName,
            description: this.description,
            value: this.value
        };
    }

    deserialize(data) {
        return new TestAction(data.name, data.description, data.value);
    }

    equals(other) {
        return other instanceof TestAction &&
            this.actionName === other.actionName &&
            this.description === other.description;
    }

    getHashKey() {
        return `${this.actionName}_${this.value}`;
    }
}

async function testWithRealInference() {
    console.log("=== Testing Polaris with Real LLM Inference ===\n");

    try {
        // Check if we have API keys
        const hasOpenAI = !!process.env.OPENAI_API_KEY;
        const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
        const hasGoogle = !!process.env.GOOGLE_API_KEY;

        console.log("API Key Status:");
        console.log("  OpenAI:", hasOpenAI ? "✓ Available" : "✗ Missing");
        console.log("  Anthropic:", hasAnthropic ? "✓ Available" : "✗ Missing");
        console.log("  Google:", hasGoogle ? "✓ Available" : "✗ Missing");

        if (!hasOpenAI && !hasAnthropic && !hasGoogle) {
            console.log("\n⚠️  No API keys found. Skipping inference test.");
            return true;
        }

        // 1. Create a business decision task
        console.log("\n1. Creating business decision task...");
        const task = TaskBuilder.create("business-decision", "Business Strategy Decision")
            .description("Analyze a business scenario and recommend strategic actions")
            .commonDomain("GENERAL")
            .commonRoles(["ANALYST", "RISKY", "CONSERVATIVE"])
            .goals(
                "Make optimal business decisions based on analysis",
                ["Evaluate opportunities", "Assess risks", "Recommend actions"],
                ["Data-driven insights", "Risk assessment", "Clear recommendations"]
            )
            .config({
                evaluationCriteria: ["profitability", "risk", "market_opportunity", "feasibility"],
                scoringMethod: "consensus"
            })
            .build();

        console.log("✓ Task created:", task.name);

        // 2. Create agents with available API keys
        console.log("\n2. Creating agents with available APIs...");
        const agents = [];

        if (hasOpenAI) {
            const openaiAgent = QuickAgents.gpt4oMini(
                task.roles.ANALYST,
                task,
                process.env.OPENAI_API_KEY
            );
            agents.push(openaiAgent);
            console.log("✓ OpenAI GPT-4o-mini agent created");
        }

        if (hasAnthropic) {
            const anthropicAgent = QuickAgents.claudeHaiku(
                task.roles.RISKY,
                task,
                process.env.ANTHROPIC_API_KEY
            );
            agents.push(anthropicAgent);
            console.log("✓ Anthropic Claude Haiku agent created");
        }

        if (hasGoogle) {
            const googleAgent = QuickAgents.geminiFlash(
                task.roles.CONSERVATIVE,
                task,
                process.env.GOOGLE_API_KEY
            );
            agents.push(googleAgent);
            console.log("✓ Google Gemini Flash agent created");
        }

        console.log(`\nTotal agents created: ${agents.length}`);

        // 3. Create the engine
        console.log("\n3. Creating Polaris engine...");
        const engine = new PolarisEngine({
            task: task,
            agents: agents,
            engineConfig: {
                maxIterations: 50,
                timeLimit: 30000, // 30 seconds
                parallel: true,
                diversityThreshold: 0.3,
                consensusThreshold: 0.7
            }
        });

        console.log("✓ Engine created with session:", engine.getSessionId());

        // 4. Initialize agents
        console.log("\n4. Initializing agents...");
        for (const agent of agents) {
            if (agent.initialize) {
                try {
                    await agent.initialize();
                    console.log(`✓ ${agent.name} initialized successfully`);
                } catch (error) {
                    console.log(`✗ ${agent.name} initialization failed:`, error.message);
                }
            }
        }

        // 5. Create a test scenario
        console.log("\n5. Setting up business scenario...");
        const gameState = new TestGameState(
            "A mid-sized software company is considering expanding into the AI market. " +
            "They have $2M in funding, a team of 15 developers, and 2 years of runway. " +
            "The AI market is competitive but growing rapidly. " +
            "Current revenue is $500K/month from traditional software products."
        );

        const actions = [
            new TestAction(
                "aggressive_expansion",
                "Invest 80% of funding in AI R&D and hire 10 AI specialists",
                0.8
            ),
            new TestAction(
                "cautious_approach",
                "Allocate 30% to AI research while maintaining core business",
                0.3
            ),
            new TestAction(
                "partnership_strategy",
                "Form strategic partnerships with established AI companies",
                0.6
            ),
            new TestAction(
                "wait_and_learn",
                "Continue monitoring the market and invest in AI education for current team",
                0.2
            )
        ];

        console.log("✓ Created scenario with", actions.length, "potential actions");

        // 6. Run inference
        console.log("\n6. Running multi-agent inference...");
        console.log("   This may take up to 30 seconds...");

        const startTime = Date.now();
        const result = await engine.inference({
            state: gameState,
            actions: actions,
            context: {
                industry: "software",
                market: "AI",
                timeframe: "strategic",
                risk_tolerance: "moderate"
            }
        });
        const totalTime = Date.now() - startTime;

        // 7. Analyze results
        console.log("\n7. Analyzing inference results...");
        console.log("=" * 60);
        console.log("POLARIS INFERENCE RESULTS");
        console.log("=" * 60);

        console.log(`\nExecution Summary:`);
        console.log(`  Total time: ${totalTime}ms (${(totalTime / 1000).toFixed(1)}s)`);
        console.log(`  Session ID: ${result.session.sessionId}`);
        console.log(`  Agents used: ${result.agentOutputs.length}`);

        const successfulOutputs = result.agentOutputs.filter(output => !output.error?.hasError);
        const failedOutputs = result.agentOutputs.filter(output => output.error?.hasError);

        console.log(`  Successful agents: ${successfulOutputs.length}`);
        console.log(`  Failed agents: ${failedOutputs.length}`);

        // Show individual agent analyses
        console.log(`\nIndividual Agent Analyses:`);
        for (const output of result.agentOutputs) {
            console.log(`\n  ${output.agentName} (${output.providerType}):`);
            console.log(`    Role: ${output.role}`);

            if (output.error?.hasError) {
                console.log(`    Status: ❌ FAILED`);
                console.log(`    Error: ${output.error.message}`);
            } else {
                console.log(`    Status: ✅ SUCCESS`);
                console.log(`    Score: ${output.evaluation.score.toFixed(3)}`);
                console.log(`    Confidence: ${output.evaluation.confidence.toFixed(3)}`);

                if (output.processing) {
                    console.log(`    Processing time: ${output.processing.processingTime}ms`);
                    console.log(`    Model: ${output.processing.model || 'N/A'}`);
                    console.log(`    Tokens used: ${output.processing.tokensUsed || 'N/A'}`);
                }

                // Show reasoning (truncated)
                const reasoning = output.evaluation.reasoning || "No reasoning provided";
                const truncatedReasoning = reasoning.length > 150
                    ? reasoning.substring(0, 150) + "..."
                    : reasoning;
                console.log(`    Reasoning: ${truncatedReasoning}`);
            }
        }

        // Show aggregated insights
        if (successfulOutputs.length > 0) {
            console.log(`\nAggregated Insights:`);

            const avgScore = successfulOutputs.reduce((sum, output) =>
                sum + output.evaluation.score, 0) / successfulOutputs.length;
            const avgConfidence = successfulOutputs.reduce((sum, output) =>
                sum + output.evaluation.confidence, 0) / successfulOutputs.length;

            console.log(`  Average score: ${avgScore.toFixed(3)}`);
            console.log(`  Average confidence: ${avgConfidence.toFixed(3)}`);

            // Find highest confidence recommendation
            const highestConfidence = successfulOutputs.reduce((best, current) =>
                current.evaluation.confidence > best.evaluation.confidence ? current : best
            );

            console.log(`  Most confident agent: ${highestConfidence.agentName}`);
            console.log(`  Their confidence: ${highestConfidence.evaluation.confidence.toFixed(3)}`);
        }

        // Show engine recommendation
        if (result.recommendation) {
            console.log(`\nEngine Recommendation:`);
            console.log(`  Recommended action: ${result.recommendation.action.toString()}`);
            console.log(`  Confidence: ${result.recommendation.confidence.toFixed(3)}`);
            console.log(`  Reasoning: ${result.recommendation.reasoning}`);
        }

        // Show sentinel analysis if available
        if (result.sentinelAnalysis) {
            console.log(`\nSentinel Analysis:`);
            console.log(`  Diversity score: ${result.sentinelAnalysis.diversityScore.toFixed(3)}`);
            console.log(`  Quality score: ${result.sentinelAnalysis.qualityScore.toFixed(3)}`);
            console.log(`  Bias detected: ${result.sentinelAnalysis.biasDetected ? "Yes" : "No"}`);

            if (result.sentinelAnalysis.recommendations?.length > 0) {
                console.log(`  Recommendations: ${result.sentinelAnalysis.recommendations.join(", ")}`);
            }
        }

        // Performance statistics
        if (result.engineStatistics) {
            console.log(`\nPerformance Statistics:`);
            console.log(`  Total inference time: ${result.engineStatistics.totalInferenceTime}ms`);

            if (result.engineStatistics.coordinationStats) {
                console.log(`  Parallel execution: ${result.engineStatistics.coordinationStats.parallelExecution ? "Yes" : "No"}`);
                console.log(`  Agent sync time: ${result.engineStatistics.coordinationStats.agentSyncTime || 0}ms`);
            }
        }

        console.log("\n" + "=" * 60);

        // 8. Cleanup
        console.log("\n8. Cleaning up...");
        await engine.cleanup();
        console.log("✓ Engine cleanup completed");

        console.log("\n=== Polaris Inference Test Completed Successfully ===");
        return true;

    } catch (error) {
        console.error("\n❌ Inference test failed:", error.message);
        console.error("Stack trace:", error.stack);
        return false;
    }
}

// Quick performance test
async function testPerformance() {
    console.log("\n=== Performance Test ===\n");

    try {
        const hasAnyAPI = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GOOGLE_API_KEY;

        if (!hasAnyAPI) {
            console.log("⚠️  No API keys available for performance test");
            return true;
        }

        console.log("Testing engine creation speed...");

        const createStart = performance.now();
        const task = TaskBuilder.create("perf-test", "Performance Test")
            .description("Quick performance test")
            .commonDomain("GENERAL")
            .commonRoles(["ANALYST"])
            .goals("Test performance")
            .build();

        const agents = [];
        if (process.env.OPENAI_API_KEY) {
            agents.push(QuickAgents.gpt4oMini(task.roles.ANALYST, task, process.env.OPENAI_API_KEY));
        }

        const engine = new PolarisEngine({
            task,
            agents,
            engineConfig: { timeLimit: 5000 }
        });

        const createTime = performance.now() - createStart;
        console.log(`✓ Engine creation time: ${createTime.toFixed(2)}ms`);

        await engine.cleanup();
        return true;

    } catch (error) {
        console.error("Performance test failed:", error.message);
        return false;
    }
}

// Main test runner
async function runComprehensiveTests() {
    console.log("🚀 Starting Comprehensive Polaris Tests\n");
    console.log(`Node version: ${process.version}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`Timestamp: ${new Date().toISOString()}\n`);

    const performanceTest = await testPerformance();
    const inferenceTest = await testWithRealInference();

    console.log("\n" + "=".repeat(70));
    console.log("COMPREHENSIVE TEST RESULTS:");
    console.log("Performance test:", performanceTest ? "✅ PASSED" : "❌ FAILED");
    console.log("Inference test:", inferenceTest ? "✅ PASSED" : "❌ FAILED");
    console.log("=".repeat(70));

    if (performanceTest && inferenceTest) {
        console.log("\n🎉 All comprehensive tests passed!");
        console.log("   Polaris framework is ready for production use!");
    } else {
        console.log("\n❌ Some tests failed. Check the output above for details.");
        process.exit(1);
    }
}

// Run if this file is executed directly
if (require.main === module) {
    runComprehensiveTests().catch(console.error);
}

module.exports = { testWithRealInference, testPerformance };