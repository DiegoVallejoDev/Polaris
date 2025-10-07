# Polaris Framework Test Suite

This directory contains comprehensive tests for the Polaris multi-agent decision-making framework. The tests demonstrate various capabilities across different domains and use cases.

## 🧪 Test Files Overview

### Core Framework Tests

- **`test-polaris-basic.js`** - Basic framework functionality, agent creation, and engine initialization
- **`test-polaris-inference.js`** - Multi-agent inference with real LLM APIs, business decision scenarios

### Domain-Specific Tests

- **`test-simple-philosophy.js`** - Philosophical discourse on consciousness with multiple AI perspectives
- **`test-philosophical-discourse.js`** - Advanced philosophical debates (more comprehensive version)
- **`test-chess-analysis.js`** - Chess position analysis with different playing styles (tactical, positional, defensive)

### Test Runner

- **`run-tests.js`** - Comprehensive test suite runner with filtering, timing, and reporting

## 🚀 Running Tests

### Quick Start

```bash
# Run all tests
npm test

# Or run directly
node test/run-tests.js
```

### Domain-Specific Testing

```bash
# Test basic framework functionality
node test/run-tests.js --domain=basic

# Test business inference capabilities
node test/run-tests.js --domain=inference

# Test philosophical discourse
node test/run-tests.js --domain=philosophy

# Test chess analysis
node test/run-tests.js --domain=chess
```

### Individual Test Files

```bash
# Run specific test files directly
node test/test-polaris-basic.js
node test/test-simple-philosophy.js
node test/test-chess-analysis.js
```

## 🔑 API Keys Required

The tests require API keys for various LLM providers. Set these in your `.env` file:

```env
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
GOOGLE_API_KEY=your_google_key_here
```

**Note:** Tests will gracefully handle missing API keys by skipping relevant tests or using available providers only.

## 📊 Test Descriptions

### 1. Basic Framework Tests (`test-polaris-basic.js`)

- ✅ Component validation (TaskBuilder, CommonDomains)
- ✅ Agent creation (OpenAI, Anthropic, Google)
- ✅ Engine initialization and cleanup
- ✅ Configuration validation

**Expected Duration:** ~5-10 seconds

### 2. Multi-Agent Inference (`test-polaris-inference.js`)

- 🏢 **Business Scenario:** Mid-sized software company considering AI market expansion
- 💰 **Budget:** $2M funding, 15 developers, 2-year runway
- 🎯 **Decision Options:** Aggressive expansion, cautious approach, partnerships, wait-and-learn
- 🤖 **Agents:** Analyst, Risk-taker, Conservative perspectives

**Expected Duration:** ~10-30 seconds (depending on API response times)

### 3. Philosophy Discourse (`test-simple-philosophy.js`)

- 🧠 **Question:** "What is consciousness? Is it merely brain information processing, or something more fundamental?"
- 🎭 **Positions:** Materialist reductionism, Property dualism, Panpsychism, Computational functionalism
- 👥 **Agents:** Analytical Philosopher, Socratic Questioner, Creative Thinker
- 📚 **Depth:** References to Dennett, Chalmers, contemporary philosophy of mind

**Expected Duration:** ~30-40 seconds

### 4. Chess Analysis (`test-chess-analysis.js`)

- ♟️ **Position:** Italian Game Classical Variation (famous opening)
- 📍 **FEN:** `r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4`
- 🎯 **Candidates:** O-O, c3, d3, Bxc6+, a4
- 👑 **Chess Masters:** Positional Master, Tactical Striker, Solid Defender, Critical Examiner
- 🏆 **Analysis:** King safety, piece activity, central control, tactical themes

**Expected Duration:** ~25-40 seconds

## 📈 Success Metrics

### Expected Success Rates

- **Basic Tests:** 100% (no external dependencies)
- **Inference Tests:** 95%+ (may fail due to API issues)
- **Philosophy Tests:** 95%+ (requires OpenAI API)
- **Chess Tests:** 95%+ (requires OpenAI API)

### Performance Benchmarks

- **Engine Creation:** < 10ms
- **Agent Initialization:** < 2 seconds per agent
- **Single Agent Inference:** 5-15 seconds
- **Multi-Agent Analysis:** 20-45 seconds

## 🎯 What Each Test Demonstrates

### Framework Capabilities

1. **Multi-Agent Coordination** - Agents work together while maintaining distinct perspectives
2. **Domain Flexibility** - Same framework handles business, philosophy, chess, etc.
3. **Role-Based Reasoning** - Agents adopt different analytical approaches based on their roles
4. **Robust Error Handling** - Graceful degradation when APIs fail
5. **Performance Optimization** - Parallel vs sequential processing options

### Real-World Applications

- **Business Strategy** - Multi-perspective decision analysis
- **Academic Research** - Philosophical discourse and debate
- **Game Analysis** - Strategic evaluation with different playing styles
- **Risk Assessment** - Conservative vs aggressive viewpoint synthesis

## 🔧 Troubleshooting

### Common Issues

**"No agents successfully initialized"**

- Check API keys in `.env` file
- Verify network connectivity
- Try running basic tests first

**"Test timed out"**

- API responses may be slow
- Increase timeout in `TEST_CONFIG`
- Check API rate limits

**"Module not found"**

- Run `npm run build` to compile TypeScript
- Ensure you're in the project root directory

### Debug Mode

```bash
node test/run-tests.js --debug
```

Enables detailed error logging and stack traces.

## 📝 Adding New Tests

To add a new test file:

1. Create `test-your-domain.js` in this directory
2. Import required modules: `const { ... } = require('../dist/src/index');`
3. Export test functions for the test runner
4. Add the new test to `run-tests.js` in the appropriate domain section

Example structure:

```javascript
const {
  PolarisEngine,
  TaskBuilder,
  QuickAgents,
} = require("../dist/src/index");

async function yourTestFunction() {
  // Your test logic here
  return true; // or false for failure
}

module.exports = { yourTestFunction };
```

## 🌟 Expected Output

When all tests pass, you should see output like:

```
🎉 ALL TESTS PASSED! Polaris framework is working perfectly!
📊 Success Rate: 100%
⏱️  Total Duration: 45.2s
```

This confirms that the Polaris framework is functioning correctly across all tested domains and use cases.
