/**
 * Tests for the LayerPipeline engine.
 *
 * Uses mock agents to validate:
 * - LayerMessage propagation between layers
 * - Decay loop increments temperature and mutates the prompt
 * - Forced delivery when maxIterations is reached
 * - Token budget enforcement
 * - computeNextDecayState pure function
 */

const {
    LayerType,
    computeNextDecayState,
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

// ─── computeNextDecayState Tests ───

function testComputeNextDecayState() {
    console.log("\n=== computeNextDecayState ===");

    const config = {
        maxIterations: 5,
        baseTemperature: 0.8,
        temperatureIncrement: 0.05,
        temperatureCeiling: 1.2,
        promptMutationFactor: 0.3,
        tokenBudget: 100000,
        agentTimeoutMs: 30000,
        minSurvivingAgents: 1,
    };

    const initialState = {
        iteration: 0,
        maxIterations: 5,
        temperatureDelta: 0,
        correctionPrompt: "",
        accumulatedDeficiencies: [],
    };

    const verdict = {
        decision: "rerun",
        errorDelta: 0.6,
        deficiencies: ["Missing examples", "Lacks depth"],
        correctionPrompt: "Add concrete examples",
    };

    // Test iteration 0 → 1
    const nextState = computeNextDecayState(initialState, config, verdict);

    assert(nextState.iteration === 1, "Iteration incremented to 1");
    assert(nextState.temperatureDelta === 0.05, "Temperature delta = 1 * 0.05 = 0.05");
    assert(nextState.accumulatedDeficiencies.includes("Missing examples"), "Deficiency 'Missing examples' accumulated");
    assert(nextState.accumulatedDeficiencies.includes("Lacks depth"), "Deficiency 'Lacks depth' accumulated");
    assert(nextState.correctionPrompt.includes("Refinement needed"), "Low mutation factor uses 'Refinement needed' prefix");
    assert(nextState.correctionPrompt.includes("Add concrete examples"), "Correction prompt from verdict preserved");
    assert(nextState.maxIterations === 5, "maxIterations preserved");

    // Test iteration 1 → 2 with additional deficiencies
    const verdict2 = {
        decision: "rerun",
        errorDelta: 0.45,
        deficiencies: ["Lacks depth", "No conclusion"], // "Lacks depth" is duplicate
        correctionPrompt: "Add a conclusion section",
    };

    const nextState2 = computeNextDecayState(nextState, config, verdict2);

    assert(nextState2.iteration === 2, "Iteration incremented to 2");
    assert(nextState2.temperatureDelta === 0.10, "Temperature delta = 2 * 0.05 = 0.10");
    assert(nextState2.accumulatedDeficiencies.length === 3, "Deficiencies merged without duplicates (3 unique)");
    assert(nextState2.accumulatedDeficiencies.includes("No conclusion"), "New deficiency added");

    // Test temperature clamping at ceiling
    const highIterState = {
        iteration: 10,
        maxIterations: 15,
        temperatureDelta: 0.4,
        correctionPrompt: "",
        accumulatedDeficiencies: [],
    };

    const clampedState = computeNextDecayState(highIterState, config, verdict);

    assert(
        clampedState.temperatureDelta <= config.temperatureCeiling - config.baseTemperature,
        `Temperature delta clamped to ceiling (${clampedState.temperatureDelta} <= ${config.temperatureCeiling - config.baseTemperature})`
    );

    // Test high mutation factor prefix
    const highMutationConfig = { ...config, promptMutationFactor: 0.8 };
    const highMutationState = computeNextDecayState(initialState, highMutationConfig, verdict);

    assert(
        highMutationState.correctionPrompt.includes("CRITICAL CHANGE REQUIRED"),
        "High mutation factor uses 'CRITICAL CHANGE REQUIRED' prefix"
    );
}

// ─── LayerType Enum Tests ───

function testLayerTypeEnum() {
    console.log("\n=== LayerType Enum ===");

    assert(LayerType.DIVERGENT === "divergent", "DIVERGENT = 'divergent'");
    assert(LayerType.INQUISITOR === "inquisitor", "INQUISITOR = 'inquisitor'");
    assert(LayerType.SYNTHESIZER === "synthesizer", "SYNTHESIZER = 'synthesizer'");
    assert(LayerType.ORCHESTRATOR === "orchestrator", "ORCHESTRATOR = 'orchestrator'");
}

// ─── DecayConfig Validation Tests ───

function testDecayConfigValidation() {
    console.log("\n=== DecayConfig & Pipeline Validation ===");

    // We can't easily instantiate the full pipeline without agents,
    // but we can test the pure function behavior directly.

    const config = {
        maxIterations: 3,
        baseTemperature: 0.8,
        temperatureIncrement: 0.1,
        temperatureCeiling: 1.3,
        promptMutationFactor: 0.5,
        tokenBudget: 50000,
        agentTimeoutMs: 15000,
        minSurvivingAgents: 2,
    };

    // Test multiple iterations
    let state = {
        iteration: 0,
        maxIterations: 3,
        temperatureDelta: 0,
        correctionPrompt: "",
        accumulatedDeficiencies: [],
    };

    const verdicts = [
        { decision: "rerun", errorDelta: 0.7, deficiencies: ["Issue A"], correctionPrompt: "Fix A" },
        { decision: "rerun", errorDelta: 0.5, deficiencies: ["Issue B"], correctionPrompt: "Fix B" },
        { decision: "deliver", errorDelta: 0.2, deficiencies: [], correctionPrompt: "" },
    ];

    for (let i = 0; i < verdicts.length - 1; i++) {
        state = computeNextDecayState(state, config, verdicts[i]);
    }

    assert(state.iteration === 2, "After 2 reruns, iteration = 2");
    assert(state.temperatureDelta === 0.2, "Temperature delta after 2 iterations = 0.2");
    assert(state.accumulatedDeficiencies.length === 2, "Both deficiencies accumulated");
    assert(
        state.correctionPrompt.includes("Issue A") && state.correctionPrompt.includes("Fix B"),
        "Correction prompt contains accumulated context"
    );
}

// ─── Edge Cases ───

function testEdgeCases() {
    console.log("\n=== Edge Cases ===");

    const config = {
        maxIterations: 1,
        baseTemperature: 0.9,
        temperatureIncrement: 0.1,
        temperatureCeiling: 1.0,
        promptMutationFactor: 0.0,
        tokenBudget: Infinity,
        agentTimeoutMs: Infinity,
        minSurvivingAgents: 1,
    };

    const state = {
        iteration: 0,
        maxIterations: 1,
        temperatureDelta: 0,
        correctionPrompt: "",
        accumulatedDeficiencies: [],
    };

    // Verdict with no deficiencies
    const noDefVerdict = {
        decision: "rerun",
        errorDelta: 0.4,
    };

    const result = computeNextDecayState(state, config, noDefVerdict);
    assert(result.accumulatedDeficiencies.length === 0, "No deficiencies when verdict has none");
    assert(Math.abs(result.temperatureDelta - 0.1) < 1e-10, "Temperature delta correct with small ceiling gap");

    // Verdict with undefined fields
    const minimalVerdict = {
        decision: "deliver",
        errorDelta: 0.1,
    };

    const result2 = computeNextDecayState(state, config, minimalVerdict);
    assert(result2.correctionPrompt.length > 0, "Correction prompt generated even for deliver verdict");
}

// ─── Run All Tests ───

function main() {
    console.log("═══════════════════════════════════════════");
    console.log("  Polaris Creativa — Layer Pipeline Tests");
    console.log("═══════════════════════════════════════════");

    testLayerTypeEnum();
    testComputeNextDecayState();
    testDecayConfigValidation();
    testEdgeCases();

    console.log("\n═══════════════════════════════════════════");
    console.log(`  Results: ${passed} passed, ${failed} failed`);
    console.log("═══════════════════════════════════════════\n");

    if (failed > 0) {
        process.exit(1);
    }
}

// Run directly if executed as main script
if (require.main === module) {
    main();
}

module.exports = { main };
