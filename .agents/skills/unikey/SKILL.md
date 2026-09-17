---
name: unikey
description: Use when connecting UniKey API gateway to AI products, coding agents (Kilo Code, Claude Code, Codex, OpenClaw, WorkBuddy), or custom applications.
---

# UniKey API Configuration & Reference

UniKey provides a unified entry point for multiple LLM providers (Claude, Kimi, GPT, DeepSeek, etc.) via OpenAI-compatible and Anthropic-compatible endpoints.

## Service Endpoints & Contract

| Setting | Value |
| :--- | :--- |
| **Official Console** | `https://www.getunikey.ai/` |
| **Documentation** | `https://docs.getunikey.ai/` |
| **OpenAI-Compatible Base URL** | `https://www.getunikey.ai/v1` |
| **Anthropic-Compatible Base URL** | `https://www.getunikey.ai` |
| **Chat Endpoint** | `POST https://www.getunikey.ai/v1/chat/completions` |
| **Anthropic Messages Endpoint** | `POST https://www.getunikey.ai/v1/messages` |
| **Model Discovery Endpoint** | `GET https://www.getunikey.ai/v1/models` |
| **OpenAI Auth Header** | `Authorization: Bearer <API_KEY>` |
| **Anthropic Auth Header** | `x-api-key: <API_KEY>` |

## Verified Available Models

### Claude Models
- `claude-opus-4-6` (Tested & Live Verified)
- `claude-opus-4-7`
- `claude-opus-4-8`
- `claude-haiku-4-5-20251001`

### Kimi / Moonshot Models
- `moonshotai/kimi-k3` (Tested & Live Verified - Active Channel)
- `kimi-k3` (Upstream channel requires moonshotai/kimi-k3)
- `kimi-k2.7-code` (Tested & Live Verified)
- `kimi-k2.6`
- `moonshotai/kimi-k2.7-code`

### OpenAI / GPT Models
- `gpt-5.5`
- `gpt-5.6-sol`
- `gpt-5.6-luna`
- `gpt-5.6-terra`
- `gpt-6-astra`

### DeepSeek Models
- `deepseek-v4-pro` (Tested & Live Verified)
- `deepseek-v4-flash`
- `deepseek/deepseek-v4-pro`

### GLM Models
- `z-ai/glm-5.2` (Tested & Live Verified)
- `glm-5.1` (Tested & Live Verified)
- `z-ai/glm-5.1`

## Integration Guides

### 1. Kilo Code (in Antigravity IDE)
1. Open the **Kilo Code** tab from the Activity Bar on the left.
2. Click the **Settings (Gear)** icon at the top right of the Kilo Code panel.
3. In **API Provider**, select **OpenAI Compatible**.
4. Configure:
   - **Base URL**: `https://www.getunikey.ai/v1`
   - **API Key**: `<Your UniKey API Key>`
   - **Model ID**: `claude-opus-4-6` or `kimi-k2.7-code` (or any model listed above)
5. Alternatively, select **Anthropic** with Base URL `https://www.getunikey.ai`.

### 2. Claude Code CLI
In `~/.claude/settings.json` (or `%USERPROFILE%\.claude\settings.json` on Windows):
```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "<Your UniKey API Key>",
    "ANTHROPIC_BASE_URL": "https://www.getunikey.ai",
    "ANTHROPIC_MODEL": "claude-opus-4-6",
    "API_TIMEOUT_MS": "3000000"
  }
}
```

### 3. OpenAI SDK / Custom Node.js
```javascript
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://www.getunikey.ai/v1",
  apiKey: process.env.UNIKEY_API_KEY
});

const response = await client.chat.completions.create({
  model: "kimi-k2.7-code", // or "claude-opus-4-6"
  messages: [{ role: "user", content: "Hello!" }]
});
```
