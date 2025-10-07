/**
 * Polaris Test Suite - Comprehensive Multi-Agent Framework Testing
 * 
 * This test suite demonstrates the capabilities of the Polaris framework
 * across different domains: basic functionality, business decisions, 
 * philosophical discourse, and chess analysis.
 * 
 * Usage:
 *   npm test                    # Run all tests
 *   node test/run-tests.js      # Direct execution
 *   node test/run-tests.js --domain=chess  # Run specific domain tests
 */

const { testBasicPolarisSetup, testIndividualComponents } = require('./test-polaris-basic');
const { testWithRealInference, testPerformance } = require('./test-polaris-inference');
const { simplePhilosophyTest } = require('./test-simple-philosophy');
const { chessAnalysisTest, chessTacticsTest } = require('./test-chess-analysis');

// Test configuration
const TEST_CONFIG = {
    timeout: 60000, // 60 seconds per test
    retries: 1,
    parallel: false, // Run tests sequentially to avoid API rate limits
    domains: {
        basic: ['component', 'setup'],
        inference: ['performance', 'business-decision'],
        philosophy: ['consciousness-debate'],
        chess: ['tactics', 'position-analysis']
    }
};

class TestRunner {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            skipped: 0,
            total: 0,
            details: []
        };
        this.startTime = Date.now();
    }

    async runTest(testName, testFunction, options = {}) {
        const startTime = Date.now();
        console.log(`\n${"=".repeat(60)}`);
        console.log(`🧪 Running Test: ${testName}`);
        console.log(`${"=".repeat(60)}`);

        this.results.total++;

        try {
            // Set timeout
            const timeout = options.timeout || TEST_CONFIG.timeout;
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error(`Test timed out after ${timeout}ms`)), timeout);
            });

            // Run test with timeout
            const result = await Promise.race([
                testFunction(),
                timeoutPromise
            ]);

            const duration = Date.now() - startTime;

            if (result === true || result === undefined) {
                console.log(`\n✅ ${testName} PASSED (${(duration / 1000).toFixed(1)}s)`);
                this.results.passed++;
                this.results.details.push({
                    name: testName,
                    status: 'PASSED',
                    duration,
                    error: null
                });
                return true;
            } else {
                console.log(`\n❌ ${testName} FAILED - Unexpected result: ${result}`);
                this.results.failed++;
                this.results.details.push({
                    name: testName,
                    status: 'FAILED',
                    duration,
                    error: `Unexpected result: ${result}`
                });
                return false;
            }

        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`\n❌ ${testName} FAILED - ${error.message}`);
            if (process.env.DEBUG) {
                console.error("Stack trace:", error.stack);
            }
            this.results.failed++;
            this.results.details.push({
                name: testName,
                status: 'FAILED',
                duration,
                error: error.message
            });
            return false;
        }
    }

    async runTestSuite(domain = 'all') {
        console.log("🚀 Polaris Framework Test Suite");
        console.log("=".repeat(60));
        console.log(`Node: ${process.version}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`Domain Filter: ${domain}`);
        console.log(`Started: ${new Date().toISOString()}`);

        // Check API availability
        console.log("\n🔑 API Key Status:");
        console.log(`  OpenAI: ${process.env.OPENAI_API_KEY ? '✅ Available' : '❌ Missing'}`);
        console.log(`  Anthropic: ${process.env.ANTHROPIC_API_KEY ? '✅ Available' : '❌ Missing'}`);
        console.log(`  Google: ${process.env.GOOGLE_API_KEY ? '✅ Available' : '❌ Missing'}`);

        // Basic Framework Tests
        if (domain === 'all' || domain === 'basic') {
            await this.runTest('Component Validation', testIndividualComponents);
            await this.runTest('Basic Setup', testBasicPolarisSetup);
        }

        // Performance and Inference Tests
        if (domain === 'all' || domain === 'inference') {
            await this.runTest('Performance Benchmark', testPerformance);
            await this.runTest('Multi-Agent Business Decision', testWithRealInference);
        }

        // Philosophy Tests
        if (domain === 'all' || domain === 'philosophy') {
            await this.runTest('Consciousness Philosophy Debate', simplePhilosophyTest);
        }

        // Chess Tests  
        if (domain === 'all' || domain === 'chess') {
            await this.runTest('Chess Tactics Puzzle', chessTacticsTest);
            await this.runTest('Chess Position Analysis', chessAnalysisTest);
        }

        this.printSummary();
        return this.results.failed === 0;
    }

    printSummary() {
        const totalTime = Date.now() - this.startTime;

        console.log(`\n${"=".repeat(60)}`);
        console.log("📊 TEST SUITE SUMMARY");
        console.log("=".repeat(60));

        console.log(`\n📈 Results:`);
        console.log(`  ✅ Passed: ${this.results.passed}`);
        console.log(`  ❌ Failed: ${this.results.failed}`);
        console.log(`  ⏭️  Skipped: ${this.results.skipped}`);
        console.log(`  📊 Total: ${this.results.total}`);

        console.log(`\n⏱️  Timing:`);
        console.log(`  Total Duration: ${(totalTime / 1000).toFixed(1)}s`);
        console.log(`  Average per Test: ${(totalTime / this.results.total / 1000).toFixed(1)}s`);

        if (this.results.details.length > 0) {
            console.log(`\n📋 Detailed Results:`);
            this.results.details.forEach(test => {
                const status = test.status === 'PASSED' ? '✅' : '❌';
                const duration = `${(test.duration / 1000).toFixed(1)}s`;
                console.log(`  ${status} ${test.name.padEnd(30)} ${duration}`);
                if (test.error && test.status === 'FAILED') {
                    console.log(`      Error: ${test.error}`);
                }
            });
        }

        // Success rate
        const successRate = ((this.results.passed / this.results.total) * 100).toFixed(1);
        console.log(`\n🎯 Success Rate: ${successRate}%`);

        if (this.results.failed === 0) {
            console.log(`\n🎉 ALL TESTS PASSED! Polaris framework is working perfectly!`);
        } else {
            console.log(`\n⚠️  ${this.results.failed} test${this.results.failed > 1 ? 's' : ''} failed. Check the logs above for details.`);
        }

        console.log("=".repeat(60));
    }
}

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        domain: 'all',
        debug: false,
        help: false
    };

    for (const arg of args) {
        if (arg.startsWith('--domain=')) {
            options.domain = arg.split('=')[1];
        } else if (arg === '--debug') {
            options.debug = true;
        } else if (arg === '--help' || arg === '-h') {
            options.help = true;
        }
    }

    return options;
}

function printHelp() {
    console.log(`
Polaris Test Suite

Usage:
  node test/run-tests.js [options]

Options:
  --domain=<domain>    Run tests for specific domain
                       Values: all, basic, inference, philosophy, chess
                       Default: all

  --debug             Enable debug output (stack traces, etc.)
  
  --help, -h          Show this help message

Examples:
  node test/run-tests.js                    # Run all tests
  node test/run-tests.js --domain=chess     # Run only chess tests
  node test/run-tests.js --domain=philosophy --debug

Domains:
  basic       - Framework initialization and component tests
  inference   - Performance and multi-agent business decisions  
  philosophy  - Philosophical discourse and consciousness debates
  chess       - Chess position analysis and tactical puzzles
`);
}

// Main execution
async function main() {
    const options = parseArgs();

    if (options.help) {
        printHelp();
        return;
    }

    if (options.debug) {
        process.env.DEBUG = 'true';
    }

    // Validate domain
    const validDomains = ['all', 'basic', 'inference', 'philosophy', 'chess'];
    if (!validDomains.includes(options.domain)) {
        console.error(`❌ Invalid domain: ${options.domain}`);
        console.error(`Valid domains: ${validDomains.join(', ')}`);
        process.exit(1);
    }

    const runner = new TestRunner();
    const success = await runner.runTestSuite(options.domain);

    process.exit(success ? 0 : 1);
}

// Export for npm test script
module.exports = {
    TestRunner,
    TEST_CONFIG,
    runAllTests: () => {
        const runner = new TestRunner();
        return runner.runTestSuite('all');
    }
};

// Run if executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('💥 Test suite crashed:', error.message);
        if (process.env.DEBUG) {
            console.error(error.stack);
        }
        process.exit(1);
    });
}