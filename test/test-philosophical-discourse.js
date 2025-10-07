/**
 * Philosophy Debate Test - See how agents discuss philosophical questions
 * This test demonstrates multi-agent philosophical reasoning and discourse
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

// Philosophical discussion state
class PhilosophicalState extends BaseGameState {
    constructor(question, context = {}, currentPerspective = 0) {
        super(`phil_${Date.now()}`, currentPerspective, false);
        this.question = question;
        this.context = context;
        this.previousArguments = [];
        this.keyPoints = [];
    }

    serialize() {
        return {
            id: this.id,
            question: this.question,
            context: this.context,
            currentPerspective: this.currentPlayer,
            previousArguments: this.previousArguments,
            keyPoints: this.keyPoints
        };
    }

    clone() {
        const cloned = new PhilosophicalState(this.question, { ...this.context }, this.currentPlayer);
        cloned.previousArguments = [...this.previousArguments];
        cloned.keyPoints = [...this.keyPoints];
        return cloned;
    }

    getTurnNumber() {
        return this.previousArguments.length + 1;
    }

    applyAction(action) {
        const newState = this.clone();
        newState.previousArguments.push(action.serialize());
        newState.currentPlayer = (newState.currentPlayer + 1) % 3; // Rotate between perspectives
        return newState;
    }

    getValidActions() {
        return []; // Actions are provided externally
    }

    getFeatures() {
        return [this.currentPlayer, this.previousArguments.length, this.keyPoints.length];
    }

    getHashKey() {
        return `${this.id}_${this.currentPlayer}_${this.previousArguments.length}`;
    }

    getGameInfo() {
        return {
            question: this.question,
            context: this.context,
            argumentCount: this.previousArguments.length,
            keyPoints: this.keyPoints
        };
    }
}

// Philosophical argument/position
class PhilosophicalArgument extends BaseAction {
    constructor(position, reasoning, philosopher = null, strength = 0.7) {
        super(`arg_${position.replace(/\s+/g, '_')}`, position, strength.toString());
        this.position = position;
        this.reasoning = reasoning;
        this.philosopher = philosopher; // e.g., "Kant", "Mill", "Aristotle"
        this.strength = strength;
        this.counterarguments = [];
    }

    execute(state) {
        return state.applyAction(this);
    }

    toString() {
        const philRef = this.philosopher ? ` (${this.philosopher})` : '';
        return `${this.position}${philRef}: ${this.reasoning}`;
    }

    isValid() {
        return this.reasoning && this.reasoning.length > 10;
    }

    getCost() {
        return 1.0;
    }

    getMetadata() {
        return {
            position: this.position,
            reasoning: this.reasoning,
            philosopher: this.philosopher,
            strength: this.strength,
            counterarguments: this.counterarguments
        };
    }

    serialize() {
        return {
            id: this.id,
            position: this.position,
            reasoning: this.reasoning,
            philosopher: this.philosopher,
            strength: this.strength
        };
    }

    deserialize(data) {
        return new PhilosophicalArgument(
            data.position,
            data.reasoning,
            data.philosopher,
            data.strength
        );
    }

    equals(other) {
        return other instanceof PhilosophicalArgument &&
            this.position === other.position &&
            this.reasoning === other.reasoning;
    }

    getHashKey() {
        return `${this.position}_${this.philosopher || 'anon'}`;
    }
}

async function philosophicalDebateTest() {
    console.log("🎭 Philosophical Debate: Multi-Agent Discussion\n");

    try {
        // Check available APIs
        const hasOpenAI = !!process.env.OPENAI_API_KEY;
        const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
        const hasGoogle = !!process.env.GOOGLE_API_KEY;

        console.log("Available AI Agents:");
        console.log(`  OpenAI: ${hasOpenAI ? "✅" : "❌"}`);
        console.log(`  Anthropic: ${hasAnthropic ? "✅" : "❌"}`);
        console.log(`  Google: ${hasGoogle ? "✅" : "❌"}`);

        if (!hasOpenAI && !hasAnthropic && !hasGoogle) {
            console.log("\n⚠️  No API keys available for philosophical debate");
            return true;
        }

        // 1. Create philosophical debate task
        console.log("\n📚 Creating philosophical debate task...");
        const task = TaskBuilder.create("philosophy-debate", "Philosophical Inquiry and Debate")
            .description("Engage in deep philosophical discussion with multiple perspectives and rigorous reasoning")
            .commonDomain("DEBATE")
            .commonRoles(["ANALYST", "QUESTIONING", "EXPLORER", "RISKY", "CONSERVATIVE"])
            .goals(
                "Explore philosophical questions through multi-perspective discourse",
                [
                    "Present well-reasoned philosophical arguments",
                    "Challenge assumptions and explore counterarguments",
                    "Synthesize different philosophical traditions",
                    "Maintain intellectual rigor and clarity"
                ],
                [
                    "Logical consistency",
                    "Evidence-based reasoning",
                    "Acknowledgment of complexity",
                    "Respectful discourse"
                ]
            )
            .config({
                evaluationCriteria: [
                    "logical_consistency",
                    "depth_of_reasoning",
                    "philosophical_rigor",
                    "originality",
                    "clarity_of_expression"
                ],
                scoringMethod: "consensus"
            })
            .build();

        console.log(`✅ Created task: ${task.name}`);

        // 2. Create diverse philosophical agents
        console.log("\n🤖 Assembling philosophical agents...");
        const agents = [];

        if (hasOpenAI) {
            // Analytical philosopher
            const analytical = QuickAgents.gpt4oMini(
                task.roles.ANALYST,
                task,
                process.env.OPENAI_API_KEY
            );
            analytical.name = "Analytical Phil (GPT-4o-mini)";
            agents.push(analytical);
            console.log("✅ Analytical Philosopher (rigorous, logic-focused)");

            // Questioning skeptic  
            const skeptic = QuickAgents.gpt4oMini(
                task.roles.QUESTIONING,
                task,
                process.env.OPENAI_API_KEY
            );
            skeptic.name = "Skeptical Inquirer (GPT-4o-mini)";
            agents.push(skeptic);
            console.log("✅ Skeptical Inquirer (challenges assumptions)");
        }

        if (hasAnthropic) {
            // Experimental explorer
            const explorer = QuickAgents.claudeHaiku(
                task.roles.EXPLORER,
                task,
                process.env.ANTHROPIC_API_KEY
            );
            explorer.name = "Experimental Thinker (Claude Haiku)";
            agents.push(explorer);
            console.log("✅ Experimental Thinker (novel perspectives)");
        }

        if (hasGoogle) {
            // Traditional conservative
            const traditional = QuickAgents.geminiFlash(
                task.roles.CONSERVATIVE,
                task,
                process.env.GOOGLE_API_KEY
            );
            traditional.name = "Traditional Philosopher (Gemini Flash)";
            agents.push(traditional);
            console.log("✅ Traditional Philosopher (established wisdom)");
        }

        console.log(`\n🎭 Philosophical Council assembled: ${agents.length} thinkers`);

        // 3. Create the debate engine
        console.log("\n⚙️  Initializing philosophical discourse engine...");
        const engine = new PolarisEngine({
            task: task,
            agents: agents,
            engineConfig: {
                maxIterations: 100,
                timeLimit: 45000, // 45 seconds for deep thinking
                parallel: false, // Sequential for more deliberative discussion
                diversityThreshold: 0.4, // Encourage diverse viewpoints
                consensusThreshold: 0.6 // Allow for philosophical disagreement
            }
        });

        console.log(`✅ Engine ready - Session: ${engine.getSessionId()}`);

        // 4. Initialize the philosophical agents
        console.log("\n🧠 Preparing philosophers for discourse...");
        let successfulInits = 0;
        for (const agent of agents) {
            if (agent.initialize) {
                try {
                    await agent.initialize();
                    console.log(`✅ ${agent.name} ready for philosophical discourse`);
                    successfulInits++;
                } catch (error) {
                    console.log(`❌ ${agent.name} failed initialization: ${error.message}`);
                }
            }
        }

        if (successfulInits === 0) {
            console.log("❌ No agents successfully initialized");
            return false;
        }

        // 5. Present the philosophical question
        console.log("\n" + "=".repeat(80));
        console.log("🤔 THE GREAT PHILOSOPHICAL QUESTION");
        console.log("=".repeat(80));

        const philosophicalQuestion = "What is the nature of consciousness? Is consciousness merely an emergent property of complex neural networks, or does it represent something fundamentally irreducible about the nature of mind and reality?";

        console.log(`\nQuestion: ${philosophicalQuestion}`);
        console.log("\nContext: This touches on the hard problem of consciousness, debates between physicalism and dualism, and implications for artificial intelligence and human identity.");

        const state = new PhilosophicalState(
            philosophicalQuestion,
            {
                domain: "philosophy_of_mind",
                difficulty: "advanced",
                schools: ["physicalism", "dualism", "panpsychism", "functionalism"],
                implications: ["AI consciousness", "personal identity", "free will", "moral status"]
            }
        );

        // 6. Define philosophical positions to evaluate
        const philosophicalPositions = [
            new PhilosophicalArgument(
                "Physicalist Reductionism",
                "Consciousness is nothing more than complex information processing in the brain. What we call 'consciousness' emerges from neural activity but has no special ontological status beyond the physical processes that create it.",
                "Daniel Dennett",
                0.7
            ),
            new PhilosophicalArgument(
                "Property Dualism",
                "While the brain is physical, consciousness represents irreducible mental properties that cannot be fully explained by physical processes alone. The subjective, qualitative aspects of experience (qualia) point to something beyond mere computation.",
                "David Chalmers",
                0.8
            ),
            new PhilosophicalArgument(
                "Panpsychist Integration",
                "Consciousness might be a fundamental feature of reality itself, present at all levels of organization. Complex consciousness emerges from the integration of simpler conscious experiences, solving both the combination problem and the hard problem.",
                "Philip Goff",
                0.6
            ),
            new PhilosophicalArgument(
                "Illusionist Deflation",
                "The 'hard problem' of consciousness is based on conceptual confusion. Once we explain all the functional aspects of consciousness (attention, memory, self-model), there's no additional mystery left to solve.",
                "Keith Frankish",
                0.7
            )
        ];

        console.log(`\n🎯 Philosophical positions to evaluate: ${philosophicalPositions.length}`);
        philosophicalPositions.forEach((pos, idx) => {
            console.log(`  ${idx + 1}. ${pos.position} (${pos.philosopher})`);
        });

        // 7. Conduct the philosophical discourse
        console.log("\n" + "=".repeat(80));
        console.log("🗣️  PHILOSOPHICAL DISCOURSE IN SESSION");
        console.log("=".repeat(80));
        console.log("⏱️  This may take up to 45 seconds for deep philosophical reasoning...\n");

        const startTime = Date.now();
        const result = await engine.inference({
            state: state,
            actions: philosophicalPositions,
            context: {
                setting: "academic_philosophy",
                rigor: "high",
                audience: "philosophers",
                goal: "truth-seeking",
                style: "socratic"
            }
        });
        const totalTime = Date.now() - startTime;

        // 8. Analyze the philosophical discourse
        console.log("=".repeat(80));
        console.log("📖 PHILOSOPHICAL DISCOURSE ANALYSIS");
        console.log("=".repeat(80));

        console.log(`\n⏱️  Discourse Duration: ${(totalTime / 1000).toFixed(1)} seconds`);
        console.log(`🎭 Session: ${result.session.sessionId}`);
        console.log(`🤖 Participating Agents: ${result.agentOutputs.length}`);

        const successful = result.agentOutputs.filter(o => !o.error?.hasError);
        const failed = result.agentOutputs.filter(o => o.error?.hasError);

        console.log(`✅ Successful Philosophical Contributions: ${successful.length}`);
        console.log(`❌ Failed Contributions: ${failed.length}`);

        // 9. Present each philosopher's perspective
        console.log(`\n${"=".repeat(80)}`);
        console.log("🎓 INDIVIDUAL PHILOSOPHICAL PERSPECTIVES");
        console.log("=".repeat(80));

        for (const output of result.agentOutputs) {
            console.log(`\n📝 ${output.agentName}:`);
            console.log(`   Role: ${output.role}`);
            console.log(`   Philosophical Approach: ${output.role === 'analyst' ? 'Rigorous Analysis' :
                output.role === 'questioning' ? 'Socratic Inquiry' :
                    output.role === 'explorer' ? 'Creative Exploration' :
                        output.role === 'conservative' ? 'Traditional Wisdom' : 'Unknown'}`);

            if (output.error?.hasError) {
                console.log(`   ❌ Failed to contribute: ${output.error.message}`);
                continue;
            }

            console.log(`   🎯 Philosophical Score: ${output.evaluation.score.toFixed(3)}/1.000`);
            console.log(`   🔍 Confidence: ${output.evaluation.confidence.toFixed(3)}/1.000`);

            if (output.processing) {
                console.log(`   ⚡ Thinking Time: ${(output.processing.processingTime / 1000).toFixed(1)}s`);
                console.log(`   🧠 Cognitive Load: ${output.processing.tokensUsed || 'N/A'} tokens`);
            }

            // Display the philosophical reasoning
            const reasoning = output.evaluation.reasoning || "No reasoning provided";
            console.log(`\n   🤔 Philosophical Contribution:`);
            console.log(`   ${"-".repeat(70)}`);

            // Format the reasoning nicely
            const formattedReasoning = reasoning
                .split('. ')
                .map(sentence => sentence.trim())
                .filter(sentence => sentence.length > 0)
                .map(sentence => `      ${sentence}${sentence.endsWith('.') ? '' : '.'}`)
                .join('\n');

            console.log(formattedReasoning);
            console.log(`   ${"-".repeat(70)}`);

            // Show any metadata insights
            if (output.evaluation.metadata && typeof output.evaluation.metadata === 'object') {
                const metadata = output.evaluation.metadata;
                if (metadata.keyFactors && Array.isArray(metadata.keyFactors)) {
                    console.log(`\n   🔑 Key Philosophical Points:`);
                    metadata.keyFactors.slice(0, 3).forEach(factor => {
                        console.log(`      • ${factor}`);
                    });
                }
            }
        }

        // 10. Synthesize the discourse
        if (successful.length > 0) {
            console.log(`\n${"=".repeat(80)}`);
            console.log("🔬 PHILOSOPHICAL SYNTHESIS");
            console.log("=".repeat(80));

            const avgScore = successful.reduce((sum, o) => sum + o.evaluation.score, 0) / successful.length;
            const avgConfidence = successful.reduce((sum, o) => sum + o.evaluation.confidence, 0) / successful.length;

            console.log(`\n📊 Collective Philosophical Assessment:`);
            console.log(`   Average Argument Strength: ${avgScore.toFixed(3)}/1.000`);
            console.log(`   Average Philosophical Confidence: ${avgConfidence.toFixed(3)}/1.000`);

            // Find the most confident philosophical position
            const mostConfident = successful.reduce((best, current) =>
                current.evaluation.confidence > best.evaluation.confidence ? current : best
            );

            console.log(`\n🏆 Most Confident Philosophical Voice:`);
            console.log(`   Agent: ${mostConfident.agentName}`);
            console.log(`   Confidence: ${mostConfident.evaluation.confidence.toFixed(3)}/1.000`);
            console.log(`   Their position represents the strongest philosophical conviction in this discourse.`);

            // Show diversity of thought
            const scores = successful.map(o => o.evaluation.score);
            const variance = scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
            const diversity = Math.sqrt(variance);

            console.log(`\n🌈 Philosophical Diversity:`);
            console.log(`   Diversity Index: ${diversity.toFixed(3)}`);
            console.log(`   ${diversity > 0.15 ? "High diversity - rich philosophical discourse" :
                diversity > 0.08 ? "Moderate diversity - some disagreement" :
                    "Low diversity - philosophical convergence"}`);
        }

        // 11. Engine recommendation
        if (result.recommendation) {
            console.log(`\n${"=".repeat(80)}`);
            console.log("🎯 PHILOSOPHICAL CONCLUSION");
            console.log("=".repeat(80));

            console.log(`\n📋 Recommended Philosophical Position:`);
            console.log(`   ${result.recommendation.action.toString()}`);
            console.log(`\n🔍 Confidence in Recommendation: ${result.recommendation.confidence.toFixed(3)}/1.000`);

            console.log(`\n💭 Philosophical Synthesis:`);
            const synthesis = result.recommendation.reasoning || "No synthesis provided";
            const formattedSynthesis = synthesis
                .split('. ')
                .filter(s => s.trim().length > 0)
                .map(s => `   ${s.trim()}${s.endsWith('.') ? '' : '.'}`)
                .join('\n');
            console.log(formattedSynthesis);
        }

        // 12. Final reflection
        console.log(`\n${"=".repeat(80)}`);
        console.log("💫 PHILOSOPHICAL REFLECTION");
        console.log("=".repeat(80));

        console.log(`\nThis discourse demonstrates how AI agents can engage with deep philosophical questions,`);
        console.log(`each bringing their unique perspective and reasoning style to bear on fundamental`);
        console.log(`questions about consciousness and the nature of mind.`);

        console.log(`\n🔮 The question of consciousness remains open, as it should in genuine philosophical`);
        console.log(`inquiry. The value lies not just in the conclusion, but in the quality of reasoning`);
        console.log(`and the diversity of perspectives that emerged from this AI-mediated discourse.`);

        // 13. Cleanup
        console.log(`\n🧹 Concluding philosophical session...`);
        await engine.cleanup();
        console.log("✅ Philosophical discourse concluded gracefully");

        return true;

    } catch (error) {
        console.error("\n❌ Philosophical discourse encountered an error:", error.message);
        console.error("Stack trace:", error.stack);
        return false;
    }
}

// Additional test for simpler philosophical questions
async function quickPhilosophicalTest() {
    console.log("\n🤔 Quick Philosophical Test");
    console.log("=".repeat(50));

    const hasAnyAPI = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!hasAnyAPI) {
        console.log("⚠️  No API keys for quick test");
        return true;
    }

    try {
        // Simple ethical question
        const ethicsTask = TaskBuilder.create("ethics-quick", "Quick Ethical Inquiry")
            .description("Rapid ethical reasoning")
            .commonDomain("DEBATE")
            .commonRoles(["ANALYST", "RISKY"])
            .goals("Evaluate ethical positions")
            .build();

        const agents = [];
        if (process.env.OPENAI_API_KEY) {
            agents.push(QuickAgents.gpt4oMini(ethicsTask.roles.ANALYST, ethicsTask, process.env.OPENAI_API_KEY));
        }

        if (agents.length === 0) return true;

        const engine = new PolarisEngine({
            task: ethicsTask,
            agents,
            engineConfig: { timeLimit: 10000 }
        });

        const ethicalState = new PhilosophicalState(
            "Is it ethical to lie to protect someone's feelings?"
        );

        const positions = [
            new PhilosophicalArgument("Utilitarian Yes", "Lying maximizes overall happiness and minimizes harm"),
            new PhilosophicalArgument("Deontological No", "Lying violates the categorical imperative regardless of consequences")
        ];

        console.log("Question: Is it ethical to lie to protect someone's feelings?");
        console.log("Running quick ethical analysis...");

        const result = await engine.inference({
            state: ethicalState,
            actions: positions
        });

        console.log("\nQuick Result:");
        if (result.recommendation) {
            console.log(`Recommended position: ${result.recommendation.action.position}`);
            console.log(`Confidence: ${result.recommendation.confidence.toFixed(2)}`);
        }

        await engine.cleanup();
        return true;

    } catch (error) {
        console.error("Quick test failed:", error.message);
        return false;
    }
}

// Main execution
async function runPhilosophicalTests() {
    console.log("🎭 Welcome to the Polaris Philosophical Discourse Laboratory");
    console.log("=".repeat(80));
    console.log("Where artificial minds contemplate the deepest questions of existence\n");

    const quickTest = await quickPhilosophicalTest();
    const fullTest = await philosophicalDebateTest();

    console.log("\n" + "=".repeat(80));
    console.log("🎓 PHILOSOPHICAL TEST RESULTS");
    console.log("=".repeat(80));
    console.log(`Quick Ethics Test: ${quickTest ? "✅ PASSED" : "❌ FAILED"}`);
    console.log(`Deep Consciousness Discourse: ${fullTest ? "✅ PASSED" : "❌ FAILED"}`);

    if (quickTest && fullTest) {
        console.log("\n🌟 Philosophical discourse tests completed successfully!");
        console.log("The agents have demonstrated their capacity for philosophical reasoning.");
    } else {
        console.log("\n❌ Some philosophical tests failed.");
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    runPhilosophicalTests().catch(console.error);
}

module.exports = { philosophicalDebateTest, quickPhilosophicalTest };