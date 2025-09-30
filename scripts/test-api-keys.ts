/**
 * API Key Validation Test for POLARIS Framework
 * Tests all configured API keys to ensure they work correctly
 */

import { EnvironmentConfig } from "../src/utils/config";
import axios from "axios";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

interface APITestResult {
  provider: string;
  success: boolean;
  error?: string;
  responseTime?: number;
  model?: string;
}

async function testOpenAI(): Promise<APITestResult> {
  const startTime = Date.now();

  try {
    const config = EnvironmentConfig.getAPIConfig("openai");

    if (!config.apiKey) {
      return {
        provider: "OpenAI",
        success: false,
        error: "API key not configured",
      };
    }

    const response = await axios.post(
      `${config.baseURL}/chat/completions`,
      {
        model: "gpt-3.5-turbo",
        messages: [
          { role: "user", content: "Test message for POLARIS API validation" },
        ],
        max_tokens: 10,
      },
      {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          "OpenAI-Project": process.env.OPENAI_PROJECT_ID || "",
        },
        timeout: config.timeout || 30000,
      }
    );

    return {
      provider: "OpenAI",
      success: true,
      responseTime: Date.now() - startTime,
      model: response.data.model,
    };
  } catch (error: any) {
    return {
      provider: "OpenAI",
      success: false,
      error: error.response?.data?.error?.message || error.message,
      responseTime: Date.now() - startTime,
    };
  }
}

async function testAnthropic(): Promise<APITestResult> {
  const startTime = Date.now();

  try {
    const config = EnvironmentConfig.getAPIConfig("anthropic");

    if (!config.apiKey) {
      return {
        provider: "Anthropic",
        success: false,
        error: "API key not configured",
      };
    }

    const response = await axios.post(
      `${config.baseURL}/v1/messages`,
      {
        model: "claude-3-haiku-20240307",
        max_tokens: 10,
        messages: [
          { role: "user", content: "Test message for POLARIS API validation" },
        ],
      },
      {
        headers: {
          "x-api-key": config.apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        timeout: config.timeout || 30000,
      }
    );

    return {
      provider: "Anthropic",
      success: true,
      responseTime: Date.now() - startTime,
      model: response.data.model,
    };
  } catch (error: any) {
    return {
      provider: "Anthropic",
      success: false,
      error: error.response?.data?.error?.message || error.message,
      responseTime: Date.now() - startTime,
    };
  }
}

async function testGoogle(): Promise<APITestResult> {
  const startTime = Date.now();

  try {
    const config = EnvironmentConfig.getAPIConfig("google");

    if (!config.apiKey) {
      return {
        provider: "Google",
        success: false,
        error: "API key not configured",
      };
    }

    const response = await axios.post(
      `${config.baseURL}/v1beta/models/gemini-2.0-flash:generateContent`,
      {
        contents: [
          {
            parts: [
              {
                text: "Test message for POLARIS API validation",
              },
            ],
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": config.apiKey,
        },
        timeout: config.timeout || 30000,
      }
    );

    // Validate response structure
    if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error("Invalid response structure from Google API");
    }

    return {
      provider: "Google",
      success: true,
      responseTime: Date.now() - startTime,
      model: "gemini-2.0-flash",
    };
  } catch (error: any) {
    return {
      provider: "Google",
      success: false,
      error: error.response?.data?.error?.message || error.message,
      responseTime: Date.now() - startTime,
    };
  }
}

async function testOllama(): Promise<APITestResult> {
  const startTime = Date.now();

  try {
    const config = EnvironmentConfig.getAPIConfig("ollama");

    // First check if Ollama is running
    const healthCheck = await axios.get(`${config.baseURL}/api/tags`, {
      timeout: 5000,
    });

    if (!healthCheck.data) {
      return {
        provider: "Ollama",
        success: false,
        error: "Ollama service not running",
      };
    }

    return {
      provider: "Ollama",
      success: true,
      responseTime: Date.now() - startTime,
      model: "Local service available",
    };
  } catch (error: any) {
    return {
      provider: "Ollama",
      success: false,
      error: "Ollama not installed or not running (optional)",
      responseTime: Date.now() - startTime,
    };
  }
}

async function runAPITests(): Promise<void> {
  console.log("🔑 POLARIS API Key Validation Tests");
  console.log("=====================================\n");

  // Print configuration summary
  EnvironmentConfig.printConfigSummary();
  console.log();

  // Run all tests
  const tests = [testOpenAI(), testAnthropic(), testGoogle(), testOllama()];
  const results = await Promise.all(tests);

  // Print results
  console.log("📊 API Test Results:");
  console.log("====================\n");

  let successCount = 0;
  for (const result of results) {
    const status = result.success ? "✅ PASS" : "❌ FAIL";
    const timing = result.responseTime ? ` (${result.responseTime}ms)` : "";

    console.log(`${status} ${result.provider}${timing}`);

    if (result.success) {
      successCount++;
      if (result.model) {
        console.log(`    Model: ${result.model}`);
      }
    } else {
      console.log(`    Error: ${result.error}`);
    }
    console.log();
  }

  // Summary
  console.log("📈 Summary:");
  console.log(`   ${successCount}/${results.length} APIs working correctly`);

  if (successCount === results.length) {
    console.log(
      "🎉 All APIs configured and working! POLARIS is ready for full functionality."
    );
  } else if (successCount >= 2) {
    console.log(
      "✅ Sufficient APIs working. POLARIS can run with reduced functionality."
    );
  } else {
    console.log(
      "⚠️  Limited API access. Some POLARIS features may not be available."
    );
  }

  console.log(
    "\n🚀 Next: Run `npm run example:foundation` to test the core framework!"
  );
}

// Run the tests
runAPITests().catch(console.error);
