/**
 * OpenAI API Status Checker
 * Checks API key validity, quota, and model availability
 */

import axios from "axios";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function checkOpenAIStatus() {
  console.log("🔍 OpenAI API Status Check");
  console.log("==========================\n");

  const apiKey = process.env.OPENAI_API_KEY;
  const projectId =
    process.env.OPENAI_PROJECT_ID || "proj_ZnXApPLTnfWhXlp0dZhC7aCd";

  if (!apiKey) {
    console.log("❌ OPENAI_API_KEY not found in environment variables");
    return;
  }

  console.log("✅ API Key found");
  console.log(`📋 Project ID: ${projectId}`);
  console.log(`🔑 API Key: ${apiKey.substring(0, 20)}...${apiKey.slice(-8)}\n`);

  const headers: any = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  if (projectId) {
    headers["OpenAI-Project"] = projectId;
  }

  const client = axios.create({
    baseURL: "https://api.openai.com/v1",
    headers,
    timeout: 30000,
  });

  try {
    // 1. Check API key validity by listing models
    console.log("1️⃣ Testing API Key Validity...");
    const modelsResponse = await client.get("/models");
    console.log(
      `   ✅ API Key is valid (${modelsResponse.data.data.length} models available)`
    );

    // Check if our target models are available
    const models = modelsResponse.data.data.map((m: any) => m.id);
    const targetModels = ["gpt-4o-mini", "gpt-3.5-turbo", "gpt-4"];

    console.log("\n📋 Target Model Availability:");
    targetModels.forEach((model) => {
      const available = models.includes(model);
      console.log(
        `   ${available ? "✅" : "❌"} ${model}: ${available ? "Available" : "Not Available"}`
      );
    });
  } catch (error: any) {
    console.log(
      `   ❌ API Key validation failed: ${error.response?.status} ${error.response?.statusText}`
    );
    if (error.response?.data?.error) {
      console.log(`   📝 Error details: ${error.response.data.error.message}`);
    }
    return;
  }

  try {
    // 2. Test a simple completion request
    console.log("\n2️⃣ Testing Chat Completion...");
    const testResponse = await client.post("/chat/completions", {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content:
            'Say \'API test successful\' in JSON format like {"message": "API test successful"}',
        },
      ],
      max_tokens: 50,
      temperature: 0,
      response_format: { type: "json_object" },
    });

    console.log("   ✅ Chat completion successful");
    console.log(`   📊 Usage: ${JSON.stringify(testResponse.data.usage)}`);
    console.log(
      `   💬 Response: ${testResponse.data.choices[0].message.content}`
    );
  } catch (error: any) {
    console.log(
      `   ❌ Chat completion failed: ${error.response?.status} ${error.response?.statusText}`
    );

    if (error.response?.status === 429) {
      console.log("   ⚠️  Rate limit exceeded - you may need to:");
      console.log("      • Wait before making more requests");
      console.log("      • Upgrade your OpenAI plan");
      console.log("      • Check your billing settings");

      const retryAfter = error.response?.headers?.["retry-after"];
      if (retryAfter) {
        console.log(`      • Wait ${retryAfter} seconds before retrying`);
      }
    }

    if (error.response?.data?.error) {
      console.log(`   📝 Error details: ${error.response.data.error.message}`);
      if (error.response.data.error.type) {
        console.log(`   🏷️  Error type: ${error.response.data.error.type}`);
      }
    }
  }

  try {
    // 3. Check billing/usage if possible (this might fail depending on permissions)
    console.log("\n3️⃣ Checking Account Status...");
    const billingResponse = await client.get("/dashboard/billing/subscription");
    console.log("   ✅ Billing information accessible");
    console.log(`   📋 Plan: ${billingResponse.data.plan?.title || "Unknown"}`);
  } catch (error: any) {
    console.log(
      "   ⚠️  Billing information not accessible (this is normal for most API keys)"
    );
  }

  console.log("\n🎯 Recommendations:");
  console.log(
    "   • If you're getting 429 errors, wait a few minutes before testing again"
  );
  console.log(
    "   • Consider using gpt-4o-mini (cheaper and often faster than gpt-3.5-turbo)"
  );
  console.log("   • Check your OpenAI dashboard for usage and billing status");
  console.log("   • Make sure your project ID is correct if you're using one");
}

// Run the check
if (require.main === module) {
  checkOpenAIStatus().catch(console.error);
}
