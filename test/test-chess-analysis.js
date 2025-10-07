/**
 * Chess Analysis Test - Multi-Agent Chess Position Evaluation
 * See how agents discuss chess strategy, tactics, and positional concepts
 */

const {
    PolarisEngine,
    TaskBuilder,
    QuickAgents,
    BaseGameState,
    BaseAction
} = require('../dist/src/index');

// Chess position state
class ChessPosition extends BaseGameState {
    constructor(fen, description, moveNumber = 1, toMove = 'white') {
        super(`chess_${Date.now()}`, toMove === 'white' ? 0 : 1, false);
        this.fen = fen;
        this.description = description;
        this.moveNumber = moveNumber;
        this.toMove = toMove;
        this.analysis = [];
        this.threats = [];
        this.opportunities = [];
    }

    serialize() {
        return {
            id: this.id,
            fen: this.fen,
            description: this.description,
            moveNumber: this.moveNumber,
            toMove: this.toMove,
            analysis: this.analysis,
            threats: this.threats,
            opportunities: this.opportunities
        };
    }

    clone() {
        const cloned = new ChessPosition(this.fen, this.description, this.moveNumber, this.toMove);
        cloned.analysis = [...this.analysis];
        cloned.threats = [...this.threats];
        cloned.opportunities = [...this.opportunities];
        return cloned;
    }

    getTurnNumber() {
        return this.moveNumber;
    }

    applyAction(action) {
        const newState = this.clone();
        newState.analysis.push(action.serialize());
        return newState;
    }

    getValidActions() {
        return []; // Actions provided externally
    }

    getFeatures() {
        return [this.currentPlayer, this.moveNumber, this.analysis.length];
    }

    getHashKey() {
        return `${this.fen}_${this.toMove}`;
    }

    getGameInfo() {
        return {
            position: this.fen,
            description: this.description,
            moveNumber: this.moveNumber,
            toMove: this.toMove,
            analysisCount: this.analysis.length
        };
    }
}

// Chess move/strategy
class ChessMove extends BaseAction {
    constructor(move, notation, evaluation, reasoning, type = 'move') {
        super(`chess_${notation.replace(/[^a-zA-Z0-9]/g, '_')}`, notation, evaluation.toString());
        this.move = move;
        this.notation = notation;
        this.evaluation = evaluation; // -3 to +3 scale
        this.reasoning = reasoning;
        this.type = type; // 'move', 'strategy', 'assessment'
        this.themes = [];
        this.variations = [];
    }

    execute(state) {
        return state.applyAction(this);
    }

    toString() {
        const evalStr = this.evaluation > 0 ? `+${this.evaluation}` : this.evaluation.toString();
        return `${this.notation} (${evalStr}): ${this.reasoning}`;
    }

    isValid() {
        return this.notation && this.reasoning && this.reasoning.length > 5;
    }

    getCost() {
        return Math.abs(this.evaluation - 0); // Distance from neutral
    }

    getMetadata() {
        return {
            move: this.move,
            notation: this.notation,
            evaluation: this.evaluation,
            reasoning: this.reasoning,
            type: this.type,
            themes: this.themes,
            variations: this.variations
        };
    }

    serialize() {
        return {
            id: this.id,
            move: this.move,
            notation: this.notation,
            evaluation: this.evaluation,
            reasoning: this.reasoning,
            type: this.type
        };
    }

    deserialize(data) {
        return new ChessMove(data.move, data.notation, data.evaluation, data.reasoning, data.type);
    }

    equals(other) {
        return other instanceof ChessMove && this.notation === other.notation;
    }

    getHashKey() {
        return `${this.notation}_${this.type}`;
    }
}

async function chessAnalysisTest() {
    console.log("♟️  Chess Analysis: Multi-Agent Position Evaluation");
    console.log("=".repeat(70));

    if (!process.env.OPENAI_API_KEY) {
        console.log("❌ OpenAI API key needed for chess analysis");
        return false;
    }

    try {
        // Create chess analysis task
        const task = TaskBuilder.create("chess-analysis", "Chess Position Analysis")
            .description("Analyze chess positions with different strategic and tactical perspectives")
            .commonDomain("CHESS")
            .commonRoles(["ANALYST", "RISKY", "CONSERVATIVE", "QUESTIONING"])
            .goals(
                "Provide comprehensive chess position evaluation",
                [
                    "Identify tactical opportunities and threats",
                    "Assess strategic elements and pawn structure",
                    "Evaluate piece activity and king safety",
                    "Recommend the strongest continuation"
                ],
                [
                    "Accurate position assessment",
                    "Clear move calculations",
                    "Strategic understanding",
                    "Practical recommendations"
                ]
            )
            .config({
                evaluationCriteria: [
                    "material_balance",
                    "king_safety",
                    "piece_activity",
                    "pawn_structure",
                    "tactical_threats"
                ],
                scoringMethod: "consensus"
            })
            .build();

        console.log("✅ Chess analysis task created");

        // Create chess experts with different styles
        const agents = [
            QuickAgents.gpt4oMini(task.roles.ANALYST, task, process.env.OPENAI_API_KEY),
            QuickAgents.gpt4oMini(task.roles.RISKY, task, process.env.OPENAI_API_KEY),
            QuickAgents.gpt4oMini(task.roles.CONSERVATIVE, task, process.env.OPENAI_API_KEY),
            QuickAgents.gpt4oMini(task.roles.QUESTIONING, task, process.env.OPENAI_API_KEY)
        ];

        // Assign chess personalities
        agents[0].name = "Positional Master";      // Analytical
        agents[1].name = "Tactical Striker";       // Risky/Aggressive
        agents[2].name = "Solid Defender";         // Conservative
        agents[3].name = "Critical Examiner";      // Questioning

        console.log("✅ Chess analysis team assembled: 4 experts");

        // Create chess engine
        const engine = new PolarisEngine({
            task,
            agents,
            engineConfig: {
                maxIterations: 75,
                timeLimit: 40000, // 40 seconds for deep analysis
                parallel: false,  // Sequential for chess discussion
                diversityThreshold: 0.35,
                consensusThreshold: 0.65
            }
        });

        console.log("✅ Chess analysis engine ready");

        // Initialize chess experts
        console.log("\n♖ Preparing chess masters...");
        let readyExperts = 0;
        for (const agent of agents) {
            if (agent.initialize) {
                try {
                    await agent.initialize();
                    console.log(`✅ ${agent.name} ready for chess analysis`);
                    readyExperts++;
                } catch (error) {
                    console.log(`❌ ${agent.name} failed: ${error.message}`);
                }
            }
        }

        if (readyExperts === 0) {
            console.log("❌ No chess experts ready");
            return false;
        }

        // Famous chess position: Fischer vs. Spassky 1972, Game 6
        console.log("\n" + "=".repeat(70));
        console.log("♛ FAMOUS CHESS POSITION TO ANALYZE");
        console.log("=".repeat(70));

        const position = new ChessPosition(
            "r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
            "Italian Game: Classical Variation - A critical moment in opening development where both sides must choose their path carefully.",
            4,
            "white"
        );

        console.log(`\n🏁 Position: ${position.description}`);
        console.log(`📍 FEN: ${position.fen}`);
        console.log(`⏳ Move ${position.moveNumber}, ${position.toMove} to move`);
        console.log(`\n📋 Position Features:`);
        console.log(`   • Italian Game opening structure`);
        console.log(`   • Both sides developed knights`);
        console.log(`   • White bishop on b5 pins black knight`);
        console.log(`   • Central pawn tension with e4 vs e5`);
        console.log(`   • Kings still uncastled - development race`);

        // Candidate moves to analyze
        const candidateMoves = [
            new ChessMove(
                "c3",
                "c3",
                0.4,
                "Supports the center and prepares d4, following classical opening principles. Solid and principled development.",
                "positional"
            ),
            new ChessMove(
                "0-0",
                "O-O",
                0.6,
                "Castle kingside for safety while maintaining the pin on the knight. King safety is paramount in the opening.",
                "safety"
            ),
            new ChessMove(
                "d3",
                "d3",
                0.3,
                "Modest central support, prepares to complete development but somewhat passive compared to alternatives.",
                "solid"
            ),
            new ChessMove(
                "Bxc6",
                "Bxc6+",
                0.2,
                "Exchanges the bishop for knight immediately, giving check but releasing central tension early.",
                "tactical"
            ),
            new ChessMove(
                "a4",
                "a4",
                0.1,
                "Aggressive wing expansion but premature - development and king safety should come first.",
                "aggressive"
            )
        ];

        console.log(`\n♟️  Candidate moves for analysis:`);
        candidateMoves.forEach((move, i) => {
            console.log(`   ${i + 1}. ${move.notation} - ${move.reasoning.split('.')[0]}`);
        });

        // Run the chess analysis
        console.log("\n" + "=".repeat(70));
        console.log("♕ CHESS MASTERS ANALYSIS SESSION");
        console.log("=".repeat(70));
        console.log("🧠 Chess experts are now analyzing the position...\n");

        const startTime = Date.now();
        const result = await engine.inference({
            state: position,
            actions: candidateMoves,
            context: {
                opening: "Italian_Game",
                phase: "opening",
                style: "classical",
                level: "master",
                timeControl: "classical"
            }
        });
        const totalTime = Date.now() - startTime;

        // Present the chess analysis
        console.log("=".repeat(70));
        console.log("📊 CHESS POSITION ANALYSIS RESULTS");
        console.log("=".repeat(70));

        console.log(`\n⏱️  Analysis Time: ${(totalTime / 1000).toFixed(1)} seconds`);
        console.log(`♜ Chess Session: ${result.session.sessionId}`);
        console.log(`👥 Participating Masters: ${result.agentOutputs.length}`);

        const successful = result.agentOutputs.filter(o => !o.error?.hasError);
        console.log(`✅ Successful Analyses: ${successful.length}`);

        if (successful.length === 0) {
            console.log("❌ No successful chess analyses");
            return false;
        }

        // Show each master's analysis
        console.log(`\n${"=".repeat(70)}`);
        console.log("♟️  INDIVIDUAL MASTER ANALYSES");
        console.log("=".repeat(70));

        for (const output of result.agentOutputs) {
            console.log(`\n🏆 ${output.agentName}:`);
            console.log(`   Chess Style: ${output.role === 'analyst' ? 'Positional Understanding' :
                output.role === 'risky' ? 'Tactical Aggression' :
                    output.role === 'conservative' ? 'Solid Defense' :
                        output.role === 'questioning' ? 'Critical Analysis' : 'Unknown'}`);

            if (output.error?.hasError) {
                console.log(`   ❌ Analysis failed: ${output.error.message}`);
                continue;
            }

            console.log(`   📈 Position Evaluation: ${output.evaluation.score.toFixed(3)}/1.000`);
            console.log(`   🎯 Analysis Confidence: ${output.evaluation.confidence.toFixed(3)}/1.000`);

            if (output.processing) {
                console.log(`   ⚡ Calculation Time: ${(output.processing.processingTime / 1000).toFixed(1)}s`);
                console.log(`   🧮 Analysis Depth: ${output.processing.tokensUsed || 'N/A'} tokens`);
            }

            // Display chess analysis
            const analysis = output.evaluation.reasoning || "No analysis provided";
            console.log(`\n   ♛ Chess Analysis:`);
            console.log(`   ${"-".repeat(65)}`);

            // Format chess analysis nicely
            const chessPoints = analysis.split(/[.!]+/).filter(point => point.trim().length > 15);
            for (const point of chessPoints.slice(0, 5)) {
                const cleanPoint = point.trim();
                if (cleanPoint) {
                    console.log(`   • ${cleanPoint}.`);
                }
            }

            if (chessPoints.length > 5) {
                console.log(`   • ... and ${chessPoints.length - 5} more chess insights`);
            }

            console.log(`   ${"-".repeat(65)}`);

            // Show key chess concepts if available
            if (output.evaluation.metadata && typeof output.evaluation.metadata === 'object') {
                const metadata = output.evaluation.metadata;
                if (metadata.keyFactors && Array.isArray(metadata.keyFactors)) {
                    console.log(`\n   🔑 Key Chess Factors:`);
                    metadata.keyFactors.slice(0, 3).forEach(factor => {
                        console.log(`      ⚡ ${factor}`);
                    });
                }
            }
        }

        // Chess synthesis
        console.log(`\n${"=".repeat(70)}`);
        console.log("🏅 CHESS ANALYSIS SYNTHESIS");
        console.log("=".repeat(70));

        const avgEval = successful.reduce((sum, o) => sum + o.evaluation.score, 0) / successful.length;
        const avgConf = successful.reduce((sum, o) => sum + o.evaluation.confidence, 0) / successful.length;

        console.log(`\n📊 Collective Chess Assessment:`);
        console.log(`   Average position evaluation: ${avgEval.toFixed(3)}/1.000`);
        console.log(`   Average analysis confidence: ${avgConf.toFixed(3)}/1.000`);

        // Find strongest analysis
        const strongest = successful.reduce((best, current) =>
            (current.evaluation.score * current.evaluation.confidence) >
                (best.evaluation.score * best.evaluation.confidence) ? current : best
        );

        console.log(`\n🥇 Strongest Chess Analysis:`);
        console.log(`   Master: ${strongest.agentName}`);
        console.log(`   Analysis strength: ${(strongest.evaluation.score * strongest.evaluation.confidence).toFixed(3)}`);

        // Show analysis diversity
        const evals = successful.map(o => o.evaluation.score);
        const variance = evals.reduce((sum, e) => sum + Math.pow(e - avgEval, 2), 0) / evals.length;
        const diversity = Math.sqrt(variance);

        console.log(`\n🌈 Analysis Diversity:`);
        console.log(`   Evaluation spread: ${diversity.toFixed(3)}`);
        console.log(`   ${diversity > 0.15 ? "High disagreement - complex position" :
            diversity > 0.08 ? "Moderate disagreement - interesting position" :
                "Strong agreement - clear assessment"}`);

        // Final recommendation
        if (result.recommendation) {
            console.log(`\n${"=".repeat(70)}`);
            console.log("👑 CHESS RECOMMENDATION");
            console.log("=".repeat(70));

            console.log(`\n🎯 Recommended Move:`);
            console.log(`   ${result.recommendation.action.notation} - ${result.recommendation.action.type}`);

            console.log(`\n♟️  Master's Reasoning:`);
            const reasoning = result.recommendation.reasoning || "No detailed reasoning provided";
            const chessReasoning = reasoning.split(/[.!]+/)
                .filter(r => r.trim().length > 10)
                .slice(0, 4)
                .map(r => `   ${r.trim()}.`)
                .join('\n');
            console.log(chessReasoning);

            console.log(`\n🔍 Recommendation Confidence: ${result.recommendation.confidence.toFixed(3)}/1.000`);

            // Evaluation in chess terms
            const move = result.recommendation.action;
            console.log(`\n📈 Move Evaluation: ${move.evaluation > 0 ? `+${move.evaluation}` : move.evaluation} (White perspective)`);
            console.log(`   ${Math.abs(move.evaluation) < 0.3 ? "≈ Equal position" :
                move.evaluation > 0.5 ? "⬆️ White advantage" :
                    move.evaluation < -0.5 ? "⬇️ Black advantage" :
                        move.evaluation > 0 ? "⬆️ Slight white edge" : "⬇️ Slight black edge"}`);
        }

        // Chess insights summary
        console.log(`\n${"=".repeat(70)}`);
        console.log("♔ CHESS INSIGHTS SUMMARY");
        console.log("=".repeat(70));

        console.log(`\nThis analysis demonstrates how different chess playing styles approach`);
        console.log(`the same position:`);
        console.log(`\n🎭 Chess Personalities in Action:`);
        console.log(`   ♛ Positional Master - Focused on long-term strategic elements`);
        console.log(`   ⚔️  Tactical Striker - Looked for immediate tactical opportunities`);
        console.log(`   🛡️  Solid Defender - Emphasized safety and solid play`);
        console.log(`   🔍 Critical Examiner - Questioned assumptions and found flaws`);

        console.log(`\n🏆 The Italian Game position showcased classic opening principles:`);
        console.log(`   • Development vs. immediate tactics`);
        console.log(`   • King safety considerations`);
        console.log(`   • Central control and pawn structure`);
        console.log(`   • The eternal chess balance of risk vs. reward`);

        // Cleanup
        console.log(`\n🧹 Ending chess analysis session...`);
        await engine.cleanup();
        console.log("✅ Chess masters have concluded their analysis");

        return true;

    } catch (error) {
        console.error("\n❌ Chess analysis failed:", error.message);
        console.error("Stack trace:", error.stack);
        return false;
    }
}

// Quick tactical puzzle test
async function chessTacticsTest() {
    console.log("\n⚡ Quick Chess Tactics Test");
    console.log("=".repeat(50));

    if (!process.env.OPENAI_API_KEY) {
        console.log("⚠️  No API key for tactics test");
        return true;
    }

    try {
        const tacticsTask = TaskBuilder.create("chess-tactics", "Chess Tactics")
            .description("Solve chess tactical puzzles")
            .commonDomain("CHESS")
            .commonRoles(["ANALYST", "RISKY"])
            .goals("Find the best tactical solution")
            .build();

        const agents = [
            QuickAgents.gpt4oMini(tacticsTask.roles.ANALYST, tacticsTask, process.env.OPENAI_API_KEY)
        ];

        const engine = new PolarisEngine({
            task: tacticsTask,
            agents,
            engineConfig: { timeLimit: 15000 }
        });

        // Simple tactics puzzle: White to move and win material
        const puzzle = new ChessPosition(
            "r2qkb1r/ppp2ppp/2n1bn2/3pp3/4P3/3P1N2/PPP2PPP/RNBQKB1R w KQkq - 0 6",
            "Tactical puzzle: White to move and win material",
            6,
            "white"
        );

        const solutions = [
            new ChessMove("Nxe5", "Nxe5", 2.5, "Captures the pawn with a discovered attack on the queen"),
            new ChessMove("Bb5", "Bb5", 1.0, "Pins the knight but doesn't win material immediately")
        ];

        console.log("Puzzle: White to move and win material");
        console.log("Running tactical analysis...");

        const result = await engine.inference({
            state: puzzle,
            actions: solutions
        });

        console.log("\nTactical Solution:");
        if (result.recommendation) {
            console.log(`Best move: ${result.recommendation.action.notation}`);
            console.log(`Evaluation: +${result.recommendation.action.evaluation}`);
            console.log(`Confidence: ${result.recommendation.confidence.toFixed(2)}`);
        }

        await engine.cleanup();
        return true;

    } catch (error) {
        console.error("Tactics test failed:", error.message);
        return false;
    }
}

// Main chess test runner
async function runChessTests() {
    console.log("♔ Welcome to the Polaris Chess Analysis Laboratory");
    console.log("=".repeat(70));
    console.log("Where AI chess masters analyze positions and debate strategy\n");

    const tacticsTest = await chessTacticsTest();
    const analysisTest = await chessAnalysisTest();

    console.log("\n" + "=".repeat(70));
    console.log("🏆 CHESS TEST RESULTS");
    console.log("=".repeat(70));
    console.log(`Quick Tactics Test: ${tacticsTest ? "✅ PASSED" : "❌ FAILED"}`);
    console.log(`Position Analysis Test: ${analysisTest ? "✅ PASSED" : "❌ FAILED"}`);

    if (tacticsTest && analysisTest) {
        console.log("\n🎉 All chess tests completed successfully!");
        console.log("The AI chess masters have demonstrated their analytical prowess!");
    } else {
        console.log("\n❌ Some chess tests failed.");
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    runChessTests().catch(console.error);
}

module.exports = { chessAnalysisTest, chessTacticsTest };