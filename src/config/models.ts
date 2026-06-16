/**
 * Model catalog for all supported AI providers.
 * Updated: June 2026
 *
 * Usage:
 *   import { Models } from "polaris-framework";
 *   openAiAgent({ model: Models.OpenAI.GPT_5_MINI, ... })
 */

// ═══════════════════════════════════════════════════════════════════════════════
// OpenAI Models
// ═══════════════════════════════════════════════════════════════════════════════

export const OpenAIModels = {
  // ─── GPT-5.x Generation (Latest) ───
  /** GPT-5.4 — Latest flagship, best overall performance */
  GPT_5_4: "gpt-5.4",
  /** GPT-5.4 Mini — Fast, cost-effective latest generation */
  GPT_5_4_MINI: "gpt-5.4-mini",
  /** GPT-5.4 Nano — Ultra-fast, lowest cost latest generation */
  GPT_5_4_NANO: "gpt-5.4-nano",

  /** GPT-5.2 — Strong general-purpose model */
  GPT_5_2: "gpt-5.2",
  /** GPT-5.2 Pro — Enhanced reasoning variant */
  GPT_5_2_PRO: "gpt-5.2-pro",

  /** GPT-5.1 — Reliable general-purpose model */
  GPT_5_1: "gpt-5.1",
  /** GPT-5.1 Mini — Fast GPT-5.1 variant */
  GPT_5_1_MINI: "gpt-5.1-mini",
  /** GPT-5.1 Codex — Optimized for code generation */
  GPT_5_1_CODEX: "gpt-5.1-codex",

  /** GPT-5 — First 5th-gen model */
  GPT_5: "gpt-5",
  /** GPT-5 Mini — Fast GPT-5 variant */
  GPT_5_MINI: "gpt-5-mini",
  /** GPT-5 Nano — Ultra-fast GPT-5 variant */
  GPT_5_NANO: "gpt-5-nano",

  // ─── GPT-4.1 Generation ───
  /** GPT-4.1 — Strong reasoning, good for agentic tasks */
  GPT_4_1: "gpt-4.1",
  /** GPT-4.1 Mini — Fast 4.1 variant */
  GPT_4_1_MINI: "gpt-4.1-mini",
  /** GPT-4.1 Nano — Ultra-fast 4.1 variant */
  GPT_4_1_NANO: "gpt-4.1-nano",

  // ─── Reasoning Models (o-series) ───
  /** o4-mini — Latest small reasoning model */
  O4_MINI: "o4-mini",
  /** o3 — Strong reasoning model */
  O3: "o3",
  /** o3-mini — Fast reasoning model */
  O3_MINI: "o3-mini",

  // ─── GPT-4o (Legacy, still available) ───
  /** GPT-4o — Previous flagship */
  GPT_4O: "gpt-4o",
  /** GPT-4o Mini — Previous fast model */
  GPT_4O_MINI: "gpt-4o-mini",
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Anthropic Models
// ═══════════════════════════════════════════════════════════════════════════════

export const AnthropicModels = {
  // ─── Claude 4.x Generation (Latest) ───
  /** Claude Opus 4.8 — Most capable, complex reasoning & agentic coding */
  OPUS_4_8: "claude-opus-4-8",
  /** Claude Sonnet 4.6 — Best speed/intelligence balance, extended thinking */
  SONNET_4_6: "claude-sonnet-4-6",
  /** Claude Haiku 4.5 — Fastest, near-frontier intelligence */
  HAIKU_4_5: "claude-haiku-4-5",

  // ─── Legacy (still available) ───
  /** Claude Sonnet 4.5 — Previous generation sonnet */
  SONNET_4_5: "claude-sonnet-4-5",
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Google Gemini Models
// ═══════════════════════════════════════════════════════════════════════════════

export const GoogleModels = {
  // ─── Gemini 3.x Generation (Latest) ───
  /** Gemini 3.5 Flash — Most intelligent for agentic/coding tasks (Stable) */
  GEMINI_3_5_FLASH: "gemini-3.5-flash",
  /** Gemini 3.1 Pro Preview — Advanced intelligence, complex problem-solving */
  GEMINI_3_1_PRO: "gemini-3.1-pro-preview",
  /** Gemini 3.1 Flash-Lite — Frontier performance at low cost (Stable) */
  GEMINI_3_1_FLASH_LITE: "gemini-3.1-flash-lite",
  /** Gemini 3 Flash Preview — Frontier-class, cost-efficient */
  GEMINI_3_FLASH: "gemini-3-flash-preview",

  // ─── Gemini 2.5 Generation ───
  /** Gemini 2.5 Pro — Advanced reasoning and coding (Stable) */
  GEMINI_2_5_PRO: "gemini-2.5-pro",
  /** Gemini 2.5 Flash — Best price-performance for reasoning (Stable) */
  GEMINI_2_5_FLASH: "gemini-2.5-flash",
  /** Gemini 2.5 Flash-Lite — Fastest, most budget-friendly (Stable) */
  GEMINI_2_5_FLASH_LITE: "gemini-2.5-flash-lite",
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Unified Models namespace
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * All available models organized by provider.
 *
 * @example
 * ```typescript
 * import { Models } from "polaris-framework";
 *
 * openAiAgent({ model: Models.OpenAI.GPT_5_4_MINI, ... });
 * anthropicAgent({ model: Models.Anthropic.SONNET_4_6, ... });
 * googleAgent({ model: Models.Google.GEMINI_3_5_FLASH, ... });
 * ```
 */
export const Models = {
  OpenAI: OpenAIModels,
  Anthropic: AnthropicModels,
  Google: GoogleModels,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Model tier helpers
// ═══════════════════════════════════════════════════════════════════════════════

/** Recommended models by cost/performance tier */
export const ModelTiers = {
  /** Maximum capability, highest cost */
  flagship: {
    openai: OpenAIModels.GPT_5_4,
    anthropic: AnthropicModels.OPUS_4_8,
    google: GoogleModels.GEMINI_3_1_PRO,
  },
  /** Best balance of speed, quality, and cost */
  balanced: {
    openai: OpenAIModels.GPT_5_4_MINI,
    anthropic: AnthropicModels.SONNET_4_6,
    google: GoogleModels.GEMINI_3_5_FLASH,
  },
  /** Fast and cheap, good for high-volume or Layer 1 divergent agents */
  fast: {
    openai: OpenAIModels.GPT_5_4_NANO,
    anthropic: AnthropicModels.HAIKU_4_5,
    google: GoogleModels.GEMINI_2_5_FLASH,
  },
  /** Specialized reasoning (for tasks requiring deep chain-of-thought) */
  reasoning: {
    openai: OpenAIModels.O4_MINI,
    anthropic: AnthropicModels.OPUS_4_8,
    google: GoogleModels.GEMINI_2_5_PRO,
  },
} as const;

// Type helpers
export type OpenAIModelId = (typeof OpenAIModels)[keyof typeof OpenAIModels];
export type AnthropicModelId = (typeof AnthropicModels)[keyof typeof AnthropicModels];
export type GoogleModelId = (typeof GoogleModels)[keyof typeof GoogleModels];
export type ModelId = OpenAIModelId | AnthropicModelId | GoogleModelId;
