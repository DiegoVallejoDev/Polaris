/**
 * Tests for the Strategy system — prompt strategies and output parsers.
 *
 * Tests each OutputParser with valid and invalid JSON inputs.
 * Tests each PromptStrategy to validate it generates non-empty strings.
 */

const {
    DivergentPromptStrategy,
    DivergentOutputParser,
    InquisitorPromptStrategy,
    InquisitorOutputParser,
    SynthesizerPromptStrategy,
    SynthesizerOutputParser,
    OrchestratorPromptStrategy,
    OrchestratorOutputParser,
    LayerType,
} = require("../dist/src/index");

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✓ ${message}`);
        passed++;
    } else {
        console.log(`  ✗ FAIL: ${message}`);
        failed++;
    }
}

// ─── Mock context for PromptStrategy tests ───

function createMockContext(overrides = {}) {
    return {
        role: {
            id: "test-role",
            name: "Test Analyst",
            goal: "Analyze the situation",
            instructions: "Be thorough and precise",
            perspective: "Analytical perspective",
        },
        task: {
            id: "test-task",
            name: "Test Task",
            description: "A test task",
            domain: { id: "general", name: "General", description: "General domain" },
            goals: {
                primary: "Test the pipeline",
                secondary: ["Validate output quality"],
                successCriteria: ["Output is coherent"],
            },
            roles: {},
        },
        pipelineIteration: 0,
        effectiveTemperature: 0,
        ...overrides,
    };
}

// ─── Divergent Strategy Tests ───

function testDivergentPromptStrategy() {
    console.log("\n=== DivergentPromptStrategy ===");

    const strategy = new DivergentPromptStrategy();
    const context = createMockContext();

    const systemPrompt = strategy.buildSystemPrompt(context);
    assert(systemPrompt.length > 0, "buildSystemPrompt returns non-empty string");
    assert(systemPrompt.includes("divergent"), "System prompt mentions divergent thinking");

    const userPrompt = strategy.buildUserPrompt(context);
    assert(userPrompt.length > 0, "buildUserPrompt returns non-empty string");
    assert(userPrompt.includes("Test the pipeline"), "User prompt includes task goal");

    const temp = strategy.getTemperature(context);
    assert(typeof temp === "number" && temp > 0, "getTemperature returns positive number");

    const maxTokens = strategy.getMaxTokens(context);
    assert(typeof maxTokens === "number" && maxTokens > 0, "getMaxTokens returns positive number");

    // Test with correction context
    const correctionContext = createMockContext({
        pipelineIteration: 1,
        effectiveTemperature: 0.1,
        incomingMessage: {
            sourceLayer: "orchestrator",
            targetLayer: "divergent",
            payload: {
                verdict: { decision: "rerun", errorDelta: 0.5 },
                decayState: {
                    iteration: 1,
                    correctionPrompt: "Address missing depth analysis",
                },
            },
            metadata: { tokenCount: 100, timestamp: new Date().toISOString(), sourceAgentIds: ["orch"], pipelineIteration: 1 },
        },
    });
    const correctionPrompt = strategy.buildUserPrompt(correctionContext);
    assert(correctionPrompt.includes("CORRECTION"), "User prompt includes correction block on reinjection");
}

// ─── Divergent Output Parser Tests ───

function testDivergentOutputParser() {
    console.log("\n=== DivergentOutputParser ===");

    const parser = new DivergentOutputParser();

    // Valid content
    const validResult = parser.parse({
        content: "This is a thorough exploration of the problem space with multiple angles and deep analysis of the core issues at hand.",
        tokensUsed: 50,
        model: "gpt-4o",
        processingTime: 1000,
        agentId: "agent-1",
    });

    assert(validResult.evaluation !== undefined, "Returns evaluation");
    assert(validResult.rawContent !== undefined, "Returns rawContent");
    assert(validResult.rawContent.length > 0, "rawContent is non-empty");
    assert(validResult.evaluation.confidence > 0, "Confidence > 0 for valid content");

    // Empty content
    const emptyResult = parser.parse({
        content: "",
        processingTime: 100,
        agentId: "agent-2",
    });

    assert(emptyResult.evaluation.confidence < 0.5, "Low confidence for empty content");
}

// ─── Inquisitor Strategy Tests ───

function testInquisitorPromptStrategy() {
    console.log("\n=== InquisitorPromptStrategy ===");

    const strategy = new InquisitorPromptStrategy();
    const context = createMockContext({
        incomingMessage: {
            sourceLayer: "divergent",
            targetLayer: "inquisitor",
            payload: {
                explorations: [
                    { rawContent: "Exploration 1 content", agentId: "agent-1", heuristicLabel: "Analyst" },
                    { rawContent: "Exploration 2 content", agentId: "agent-2", heuristicLabel: "Explorer" },
                ],
            },
            metadata: { tokenCount: 200, timestamp: new Date().toISOString(), sourceAgentIds: ["agent-1", "agent-2"], pipelineIteration: 0 },
        },
    });

    const systemPrompt = strategy.buildSystemPrompt(context);
    assert(systemPrompt.includes("filter"), "System prompt mentions filtering");
    assert(systemPrompt.includes("JSON"), "System prompt mentions JSON format");

    const userPrompt = strategy.buildUserPrompt(context);
    assert(userPrompt.includes("Exploration 1 content"), "User prompt includes exploration content");
    assert(userPrompt.includes("agent-1"), "User prompt includes agent IDs");

    // Empty explorations
    const emptyContext = createMockContext({
        incomingMessage: {
            sourceLayer: "divergent",
            targetLayer: "inquisitor",
            payload: { explorations: [] },
            metadata: { tokenCount: 0, timestamp: new Date().toISOString(), sourceAgentIds: [], pipelineIteration: 0 },
        },
    });
    const emptyPrompt = strategy.buildUserPrompt(emptyContext);
    assert(emptyPrompt.includes("WARNING"), "Warning shown when no explorations");
}

// ─── Inquisitor Output Parser Tests ───

function testInquisitorOutputParser() {
    console.log("\n=== InquisitorOutputParser ===");

    const parser = new InquisitorOutputParser();

    // Valid JSON
    const validJSON = JSON.stringify({
        validatedFragments: [
            { content: "Fragment 1", sourceAgentId: "agent-1", justification: "Logically sound", coherenceScore: 0.9 },
            { content: "Fragment 2", sourceAgentId: "agent-2", justification: "Well-reasoned", coherenceScore: 0.7 },
        ],
        rejectedCount: 1,
        totalEvaluated: 3,
    });

    const validResult = parser.parse({
        content: validJSON,
        tokensUsed: 100,
        model: "gpt-4o",
        processingTime: 500,
        agentId: "inquisitor-1",
    });

    assert(validResult.validatedFragments !== undefined, "Returns validatedFragments");
    assert(validResult.validatedFragments.length === 2, "Correct fragment count");
    assert(validResult.validatedFragments[0].coherenceScore === 0.9, "Correct coherence score");
    assert(validResult.evaluation.confidence > 0.5, "High confidence for valid parse");

    // Markdown-wrapped JSON
    const wrappedJSON = "```json\n" + validJSON + "\n```";
    const wrappedResult = parser.parse({
        content: wrappedJSON,
        processingTime: 500,
        agentId: "inquisitor-2",
    });
    assert(wrappedResult.validatedFragments.length === 2, "Parses markdown-wrapped JSON");

    // Invalid JSON
    const invalidResult = parser.parse({
        content: "This is not JSON at all",
        processingTime: 500,
        agentId: "inquisitor-3",
    });
    assert(invalidResult.validatedFragments.length === 0, "Empty fragments for invalid JSON");
    assert(invalidResult.evaluation.confidence < 0.5, "Low confidence for parse failure");
}

// ─── Synthesizer Strategy Tests ───

function testSynthesizerPromptStrategy() {
    console.log("\n=== SynthesizerPromptStrategy ===");

    const strategy = new SynthesizerPromptStrategy();
    const context = createMockContext({
        incomingMessage: {
            sourceLayer: "inquisitor",
            targetLayer: "synthesizer",
            payload: {
                validatedFragments: [
                    { content: "Key insight about the problem", sourceAgentId: "agent-1", justification: "Sound logic", coherenceScore: 0.85 },
                ],
                filterMetrics: { totalEvaluated: 3, accepted: 1, rejected: 2 },
            },
            metadata: { tokenCount: 150, timestamp: new Date().toISOString(), sourceAgentIds: ["inquisitor-1"], pipelineIteration: 0 },
        },
    });

    const systemPrompt = strategy.buildSystemPrompt(context);
    assert(systemPrompt.includes("synthesizer"), "System prompt mentions synthesis");

    const userPrompt = strategy.buildUserPrompt(context);
    assert(userPrompt.includes("Key insight"), "User prompt includes fragment content");
    assert(userPrompt.includes("1 accepted"), "User prompt includes filter metrics");
}

// ─── Synthesizer Output Parser Tests ───

function testSynthesizerOutputParser() {
    console.log("\n=== SynthesizerOutputParser ===");

    const parser = new SynthesizerOutputParser();

    // Good draft with sections (must be > 200 chars for high confidence)
    const goodDraft = "## 1. Introduction\nThis is a comprehensive introduction to the analysis providing substantial context and background information for the reader to understand the core problem space and its dimensions.\n\n## 2. Analysis\nA detailed deep dive into the core mechanisms and how they interact with each other to produce the observed results in various scenarios.\n\n## 3. Conclusion\nA strong and well-supported ending that brings together all the key findings and insights from the analysis above.";
    const goodResult = parser.parse({
        content: goodDraft,
        tokensUsed: 200,
        model: "gpt-4o",
        processingTime: 1500,
        agentId: "synth-1",
    });

    assert(goodResult.synthesizedDraft !== undefined, "Returns synthesizedDraft");
    assert(goodResult.synthesizedDraft.includes("Introduction"), "Draft preserved");
    assert(goodResult.evaluation.confidence >= 0.8, "High confidence for structured draft");

    // Minimal draft
    const minimalResult = parser.parse({
        content: "Short.",
        processingTime: 200,
        agentId: "synth-2",
    });
    assert(minimalResult.evaluation.confidence < 0.5, "Low confidence for minimal draft");
}

// ─── Orchestrator Strategy Tests ───

function testOrchestratorPromptStrategy() {
    console.log("\n=== OrchestratorPromptStrategy ===");

    const strategy = new OrchestratorPromptStrategy();
    const context = createMockContext({
        incomingMessage: {
            sourceLayer: "synthesizer",
            targetLayer: "orchestrator",
            payload: {
                draft: "A complete draft about the topic.",
                structure: { sectionCount: 3, estimatedTokens: 500 },
            },
            metadata: { tokenCount: 500, timestamp: new Date().toISOString(), sourceAgentIds: ["synth-1"], pipelineIteration: 0 },
        },
        cumulativeTokenUsage: {
            totalTokens: 5000,
            currentIterationTokens: 2500,
            tokenBudget: 50000,
            remainingBudget: 45000,
            averageTokensPerIteration: 2500,
        },
    });

    const systemPrompt = strategy.buildSystemPrompt(context);
    assert(systemPrompt.includes("quality gate"), "System prompt mentions quality gate");
    assert(systemPrompt.includes("ROI"), "System prompt mentions ROI calculation");

    const userPrompt = strategy.buildUserPrompt(context);
    assert(userPrompt.includes("A complete draft"), "User prompt includes the draft");
    assert(userPrompt.includes("TOKEN BUDGET"), "User prompt includes token budget info");
    assert(userPrompt.includes("45000"), "User prompt includes remaining budget");
}

// ─── Orchestrator Output Parser Tests ───

function testOrchestratorOutputParser() {
    console.log("\n=== OrchestratorOutputParser ===");

    const parser = new OrchestratorOutputParser();

    // Valid deliver verdict
    const deliverJSON = JSON.stringify({
        decision: "deliver",
        errorDelta: 0.15,
        deficiencies: [],
        correctionPrompt: "",
    });
    const deliverResult = parser.parse({
        content: deliverJSON,
        tokensUsed: 50,
        model: "gpt-4o",
        processingTime: 800,
        agentId: "orch-1",
    });

    assert(deliverResult.orchestratorVerdict !== undefined, "Returns verdict");
    assert(deliverResult.orchestratorVerdict.decision === "deliver", "Correct deliver decision");
    assert(deliverResult.orchestratorVerdict.errorDelta === 0.15, "Correct errorDelta");

    // Valid rerun verdict
    const rerunJSON = JSON.stringify({
        decision: "rerun",
        errorDelta: 0.65,
        deficiencies: ["Missing depth", "No examples"],
        correctionPrompt: "Add concrete examples and deeper analysis",
    });
    const rerunResult = parser.parse({
        content: rerunJSON,
        processingTime: 800,
        agentId: "orch-2",
    });

    assert(rerunResult.orchestratorVerdict.decision === "rerun", "Correct rerun decision");
    assert(rerunResult.orchestratorVerdict.deficiencies.length === 2, "Correct deficiency count");
    assert(rerunResult.orchestratorVerdict.correctionPrompt.includes("examples"), "Correction prompt preserved");

    // Invalid JSON → conservative rerun
    const invalidResult = parser.parse({
        content: "Not valid JSON {broken",
        processingTime: 800,
        agentId: "orch-3",
    });
    assert(invalidResult.orchestratorVerdict.decision === "rerun", "Defaults to rerun on parse failure");
    assert(invalidResult.orchestratorVerdict.errorDelta === 0.8, "High errorDelta on parse failure");

    // Markdown-wrapped JSON
    const wrappedResult = parser.parse({
        content: "```json\n" + deliverJSON + "\n```",
        processingTime: 800,
        agentId: "orch-4",
    });
    assert(wrappedResult.orchestratorVerdict.decision === "deliver", "Parses markdown-wrapped JSON");

    // Out-of-range errorDelta gets clamped
    const clampedJSON = JSON.stringify({ decision: "deliver", errorDelta: 1.5, deficiencies: [], correctionPrompt: "" });
    const clampedResult = parser.parse({
        content: clampedJSON,
        processingTime: 800,
        agentId: "orch-5",
    });
    assert(clampedResult.orchestratorVerdict.errorDelta === 1.0, "errorDelta clamped to 1.0");
}

// ─── Run All Tests ───

function main() {
    console.log("═══════════════════════════════════════");
    console.log("  Polaris Creativa — Strategy Tests");
    console.log("═══════════════════════════════════════");

    testDivergentPromptStrategy();
    testDivergentOutputParser();
    testInquisitorPromptStrategy();
    testInquisitorOutputParser();
    testSynthesizerPromptStrategy();
    testSynthesizerOutputParser();
    testOrchestratorPromptStrategy();
    testOrchestratorOutputParser();

    console.log("\n═══════════════════════════════════════");
    console.log(`  Results: ${passed} passed, ${failed} failed`);
    console.log("═══════════════════════════════════════\n");

    if (failed > 0) {
        process.exit(1);
    }
}

// Run directly if executed as main script
if (require.main === module) {
    main();
}

module.exports = { main };
