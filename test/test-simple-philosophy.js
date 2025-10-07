/**
 * Simple Philosophy Test - OpenAI agents discussing consciousness
 * Focused test to see philosophical discourse without API connectivity issues
 */

const {
    PolarisEngine,
    TaskBuilder,
    QuickAgents,
    BaseGameState,
    BaseAction
} = require('../dist/src/index');

// Simple philosophical state
class PhilState extends BaseGameState {
    constructor(question) {
        super(`phil_${Date.now()}`, 0, false);
        this.question = question;
    }

    serialize() {
        return { id: this.id, question: this.question };
    }

    clone() {
        return new PhilState(this.question);
    }

    getTurnNumber() { return 1; }
    applyAction(action) { return this.clone(); }
    getValidActions() { return []; }
    getFeatures() { return [1]; }
    getHashKey() { return this.id; }
    getGameInfo() { return { question: this.question }; }
}

// Simple philosophical argument
class PhilArgument extends BaseAction {
    constructor(position, reasoning) {
        super(`pos_${position.replace(/\s+/g, '_')}`, position, "0.7");
        this.position = position;
        this.reasoning = reasoning;
    }

    execute(state) { return state; }
    toString() { return `${this.position}: ${this.reasoning}`; }
    isValid() { return true; }
    getCost() { return 1.0; }
    getMetadata() { return { position: this.position, reasoning: this.reasoning }; }
    serialize() { return { position: this.position, reasoning: this.reasoning }; }
    deserialize(data) { return new PhilArgument(data.position, data.reasoning); }
    equals(other) { return other instanceof PhilArgument && this.position === other.position; }
    getHashKey() { return this.position; }
}

async function simplePhilosophyTest() {
    console.log("🧠 Simple Philosophy Test: What is Consciousness?");
    console.log("=" * 60);

    if (!process.env.OPENAI_API_KEY) {
        console.log("❌ OpenAI API key needed for this test");
        return false;
    }

    try {
        // Create philosophical task
        const task = TaskBuilder.create("consciousness", "Consciousness Inquiry")
            .description("Explore the nature of consciousness through different philosophical lenses")
            .commonDomain("DEBATE")
            .commonRoles(["ANALYST", "QUESTIONING", "EXPLORER"])
            .goals("Understand consciousness from multiple perspectives")
            .build();

        console.log("✅ Philosophical task created");

        // Create three different OpenAI agents with different perspectives
        const agents = [
            QuickAgents.gpt4oMini(task.roles.ANALYST, task, process.env.OPENAI_API_KEY),
            QuickAgents.gpt4oMini(task.roles.QUESTIONING, task, process.env.OPENAI_API_KEY),
            QuickAgents.gpt4oMini(task.roles.EXPLORER, task, process.env.OPENAI_API_KEY)
        ];

        // Give them distinct names and modify their approach
        agents[0].name = "Analytical Philosopher";
        agents[1].name = "Socratic Questioner";
        agents[2].name = "Creative Thinker";

        console.log("✅ Created 3 philosophical agents");

        // Create engine for sequential discussion
        const engine = new PolarisEngine({
            task,
            agents,
            engineConfig: {
                maxIterations: 50,
                timeLimit: 30000,
                parallel: false, // Sequential for more thoughtful discourse
                diversityThreshold: 0.4
            }
        });

        console.log("✅ Philosophical discourse engine ready");

        // Initialize agents
        for (const agent of agents) {
            if (agent.initialize) {
                try {
                    await agent.initialize();
                    console.log(`✅ ${agent.name} ready for philosophical discussion`);
                } catch (error) {
                    console.log(`❌ ${agent.name} failed: ${error.message}`);
                }
            }
        }

        // The Great Question
        console.log("\n" + "=".repeat(70));
        console.log("🤔 THE PHILOSOPHICAL QUESTION");
        console.log("=".repeat(70));

        const question = "What is consciousness? Is it merely the brain's information processing, or something more fundamental to the nature of reality itself?";
        console.log(`\nQuestion: ${question}`);

        const state = new PhilState(question);

        // Different philosophical positions to consider
        const positions = [
            new PhilArgument(
                "Materialist Reductionism",
                "Consciousness is nothing but complex neural computation - an emergent property of brain activity with no special metaphysical status."
            ),
            new PhilArgument(
                "Property Dualism",
                "While brains are physical, consciousness involves irreducible mental properties - the 'what it's like' aspect of experience cannot be fully captured by physical description."
            ),
            new PhilArgument(
                "Panpsychist View",
                "Consciousness might be a fundamental feature of reality itself, present in all matter and combined into complex experiences in brains."
            ),
            new PhilArgument(
                "Computational Functionalism",
                "Consciousness emerges from specific types of information processing patterns - it's about the computation, not the substrate."
            )
        ];

        console.log(`\n📚 Philosophical positions to evaluate:`);
        positions.forEach((pos, i) => {
            console.log(`  ${i + 1}. ${pos.position}`);
            console.log(`     "${pos.reasoning}"`);
        });

        // Run the philosophical discourse
        console.log("\n" + "=".repeat(70));
        console.log("🗣️  PHILOSOPHICAL DISCOURSE");
        console.log("=".repeat(70));
        console.log("💭 Agents are now contemplating the nature of consciousness...\n");

        const startTime = Date.now();
        const result = await engine.inference({
            state,
            actions: positions,
            context: {
                domain: "philosophy_of_mind",
                goal: "understanding_consciousness",
                style: "rigorous_academic"
            }
        });
        const totalTime = Date.now() - startTime;

        // Show the philosophical discourse results
        console.log("=".repeat(70));
        console.log("📖 PHILOSOPHICAL DISCOURSE RESULTS");
        console.log("=".repeat(70));

        console.log(`\n⏱️  Total thinking time: ${(totalTime / 1000).toFixed(1)} seconds`);
        console.log(`🎭 Participating philosophers: ${result.agentOutputs.length}`);

        const successful = result.agentOutputs.filter(o => !o.error?.hasError);
        console.log(`✅ Successful contributions: ${successful.length}`);

        // Show each philosopher's contribution
        console.log(`\n${"=".repeat(70)}`);
        console.log("🎓 INDIVIDUAL PHILOSOPHICAL CONTRIBUTIONS");
        console.log("=".repeat(70));

        for (const output of result.agentOutputs) {
            console.log(`\n🔬 ${output.agentName}:`);
            console.log(`   Philosophical Role: ${output.role}`);
            console.log(`   Approach: ${output.role === 'analyst' ? 'Rigorous logical analysis' :
                output.role === 'questioning' ? 'Socratic questioning and skepticism' :
                    output.role === 'explorer' ? 'Creative and novel perspectives' : 'Unknown'}`);

            if (output.error?.hasError) {
                console.log(`   ❌ Could not contribute: ${output.error.message}`);
                continue;
            }

            console.log(`   🎯 Philosophical strength: ${output.evaluation.score.toFixed(3)}/1.000`);
            console.log(`   🔍 Confidence: ${output.evaluation.confidence.toFixed(3)}/1.000`);

            if (output.processing) {
                console.log(`   ⚡ Contemplation time: ${(output.processing.processingTime / 1000).toFixed(1)}s`);
                console.log(`   🧠 Tokens used: ${output.processing.tokensUsed || 'N/A'}`);
            }

            // Show their philosophical reasoning
            const reasoning = output.evaluation.reasoning || "No reasoning provided";
            console.log(`\n   💭 Philosophical Analysis:`);
            console.log(`   ${"-".repeat(65)}`);

            // Format nicely
            const lines = reasoning.split(/[.!?]+/).filter(line => line.trim().length > 10);
            for (const line of lines.slice(0, 4)) { // Show first 4 key points
                console.log(`   • ${line.trim()}.`);
            }

            if (lines.length > 4) {
                console.log(`   • ... and ${lines.length - 4} more philosophical points`);
            }

            console.log(`   ${"-".repeat(65)}`);
        }

        // Philosophical synthesis
        if (successful.length > 0) {
            console.log(`\n${"=".repeat(70)}`);
            console.log("🔮 PHILOSOPHICAL SYNTHESIS");
            console.log("=".repeat(70));

            const avgScore = successful.reduce((sum, o) => sum + o.evaluation.score, 0) / successful.length;
            const avgConfidence = successful.reduce((sum, o) => sum + o.evaluation.confidence, 0) / successful.length;

            console.log(`\n📊 Collective Philosophical Assessment:`);
            console.log(`   Average argument strength: ${avgScore.toFixed(3)}/1.000`);
            console.log(`   Average confidence: ${avgConfidence.toFixed(3)}/1.000`);

            // Find most compelling argument
            const mostCompelling = successful.reduce((best, current) =>
                (current.evaluation.score * current.evaluation.confidence) >
                    (best.evaluation.score * best.evaluation.confidence) ? current : best
            );

            console.log(`\n🏆 Most Compelling Philosophical Analysis:`);
            console.log(`   Agent: ${mostCompelling.agentName}`);
            console.log(`   Compelling factor: ${(mostCompelling.evaluation.score * mostCompelling.evaluation.confidence).toFixed(3)}`);
        }

        // Show final recommendation
        if (result.recommendation) {
            console.log(`\n${"=".repeat(70)}`);
            console.log("🎯 PHILOSOPHICAL CONCLUSION");
            console.log("=".repeat(70));

            console.log(`\n📝 Recommended Philosophical Position:`);
            console.log(`   ${result.recommendation.action.position}`);
            console.log(`\n💭 Supporting Reasoning:`);
            console.log(`   ${result.recommendation.reasoning}`);
            console.log(`\n🔍 Confidence: ${result.recommendation.confidence.toFixed(3)}/1.000`);
        }

        // Final thoughts
        console.log(`\n${"=".repeat(70)}`);
        console.log("💫 PHILOSOPHICAL REFLECTION");
        console.log("=".repeat(70));

        console.log(`\nThis discourse demonstrates AI agents engaging with one of philosophy's`);
        console.log(`deepest questions. Each agent brought their unique analytical approach:`);
        console.log(`• The Analytical Philosopher provided rigorous logical analysis`);
        console.log(`• The Socratic Questioner challenged assumptions and probed deeper`);
        console.log(`• The Creative Thinker explored novel perspectives and possibilities`);

        console.log(`\nThe question of consciousness remains as fascinating as ever, but`);
        console.log(`we've seen how different AI reasoning styles can illuminate different`);
        console.log(`aspects of this fundamental mystery.`);

        await engine.cleanup();
        console.log("\n✅ Philosophical session concluded");

        return true;

    } catch (error) {
        console.error("\n❌ Philosophy test failed:", error.message);
        return false;
    }
}

// Run the test
if (require.main === module) {
    simplePhilosophyTest().then(success => {
        if (success) {
            console.log("\n🎉 Philosophy test completed successfully!");
        } else {
            console.log("\n❌ Philosophy test failed.");
            process.exit(1);
        }
    }).catch(console.error);
}

module.exports = { simplePhilosophyTest };