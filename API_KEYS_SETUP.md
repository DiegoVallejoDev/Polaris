# 🔑 POLARIS API Keys Setup Guide

## Required API Keys for Full Functionality

To use POLARIS with all Web API agents, you'll need API keys from the following providers:

### 🤖 **OpenAI GPT Models**

- **Purpose**: Advanced natural language reasoning and strategic thinking
- **Models**: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
- **Get your key**: [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Cost**: Pay-per-token pricing (varies by model)
- **Rate Limits**: Typically 60 requests/minute for new accounts

### 🧠 **Anthropic Claude**

- **Purpose**: Analytical reasoning and careful evaluation
- **Models**: Claude-3 Opus, Claude-3 Sonnet, Claude-3 Haiku
- **Get your key**: [https://console.anthropic.com/](https://console.anthropic.com/)
- **Cost**: Pay-per-token pricing (competitive with OpenAI)
- **Rate Limits**: Typically 50 requests/minute

### 🔍 **Google Gemini**

- **Purpose**: Multimodal reasoning and fast inference
- **Models**: Gemini Pro, Gemini Pro Vision
- **Get your key**: [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
- **Cost**: Generous free tier, then pay-per-token
- **Rate Limits**: Typically 60 requests/minute

### 🖥️ **Ollama (Local Models) - Optional**

- **Purpose**: Privacy-focused local AI models
- **Models**: Llama 2, Code Llama, Mistral, Phi-3, and many others
- **Installation**: [https://ollama.ai/](https://ollama.ai/)
- **Cost**: Free (runs on your hardware)
- **Rate Limits**: Only limited by your hardware

---

## 🚀 **Quick Setup**

### 1. **Copy Environment Template**

```bash
cp .env.example .env
```

### 2. **Add Your API Keys**

Edit the `.env` file and replace the placeholder values:

```bash
# Required for OpenAI agents
OPENAI_API_KEY=sk-proj-your-actual-openai-key-here

# Required for Anthropic agents
ANTHROPIC_API_KEY=sk-ant-your-actual-anthropic-key-here

# Required for Google agents
GOOGLE_API_KEY=your-actual-google-api-key-here

# Optional: For local Ollama models
OLLAMA_BASE_URL=http://localhost:11434
```

### 3. **Install Dependencies**

```bash
pnpm install
```

### 4. **Test Configuration**

```bash
pnpm run example:foundation
```

---

## 💰 **Cost Estimation**

### **Development/Testing** (Light Usage)

- **OpenAI**: ~$5-10/month for experimentation
- **Anthropic**: ~$5-10/month for experimentation
- **Google**: Free tier covers most development needs
- **Total**: ~$10-20/month

### **Production** (Heavy Usage)

- **OpenAI**: $50-200/month depending on usage
- **Anthropic**: $50-200/month depending on usage
- **Google**: $20-100/month depending on usage
- **Total**: $120-500/month for production workloads

### **Budget-Friendly Option**

- Use **Ollama** for local models (free after hardware cost)
- Use **Google Gemini** free tier for cloud inference
- **Total**: $0/month (excluding hardware)

---

## 🔒 **Security Best Practices**

### **API Key Management**

- ✅ Never commit `.env` files to version control (already in `.gitignore`)
- ✅ Use separate API keys for development/staging/production
- ✅ Rotate API keys regularly (every 90 days recommended)
- ✅ Monitor API usage and set billing alerts

### **Environment Separation**

```bash
# Development
cp .env.example .env.development

# Production
cp .env.example .env.production

# Load specific environment
NODE_ENV=production pnpm start
```

### **Rate Limiting**

POLARIS includes built-in rate limiting to prevent accidental API overuse:

- OpenAI: 60 requests/minute (configurable)
- Anthropic: 50 requests/minute (configurable)
- Google: 60 requests/minute (configurable)

### **API Key Validation**

```typescript
import { EnvironmentConfig } from "polaris-framework";

// Check if all API keys are present
const validation = EnvironmentConfig.validateAPIKeys();
if (!validation.valid) {
  console.error("Missing API keys:", validation.missing);
}
```

---

## 🛠️ **Advanced Configuration**

### **Custom API Endpoints**

```bash
# Use custom OpenAI-compatible endpoint
OPENAI_BASE_URL=https://your-custom-endpoint.com/v1

# Use Azure OpenAI
OPENAI_BASE_URL=https://your-resource.openai.azure.com/
```

### **Performance Tuning**

```bash
# Increase concurrent agents for faster processing
MAX_CONCURRENT_AGENTS=10

# Adjust timeouts for slower models
API_TIMEOUT=60000

# Enable agent learning
ENABLE_AGENT_LEARNING=true
```

### **Development Features**

```bash
# Enable detailed debugging
DEBUG=polaris:*
POLARIS_LOG_LEVEL=debug

# Test with real API calls
TEST_API_CALLS=true

# Enable performance metrics
ENABLE_METRICS=true
```

---

## 🆘 **Troubleshooting**

### **Common Issues**

#### **"API key not found" error**

```bash
# Check if .env file exists and has correct keys
cat .env | grep API_KEY

# Ensure no spaces around the = sign
OPENAI_API_KEY=sk-proj-... # ✅ Correct
OPENAI_API_KEY = sk-proj-... # ❌ Wrong
```

#### **"Rate limit exceeded" error**

```bash
# Reduce rate limits in .env
OPENAI_RATE_LIMIT=30
ANTHROPIC_RATE_LIMIT=25

# Add delays between requests
RETRY_DELAY=2000
```

#### **"Connection timeout" error**

```bash
# Increase timeout values
API_TIMEOUT=60000
POLARIS_DEFAULT_TIMEOUT=45000
```

### **API Key Testing**

```typescript
// Test individual API connections
import { EnvironmentConfig } from "polaris-framework";

const config = EnvironmentConfig.getAPIConfig("openai");
console.log("OpenAI config:", {
  hasKey: !!config.apiKey,
  baseURL: config.baseURL,
  rateLimit: config.rateLimitPerMinute,
});
```

---

## 📞 **Support**

- **Documentation**: [docs/README.md](docs/README.md)
- **Issues**: [GitHub Issues](https://github.com/DiegoVallejoDev/Polaris/issues)
- **Discussions**: [GitHub Discussions](https://github.com/DiegoVallejoDev/Polaris/discussions)

---

**🔐 Remember: Keep your API keys secure and never share them publicly!**
