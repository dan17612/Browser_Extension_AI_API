// Background service worker for AI Chat Pro

const DEFAULT_SETTINGS = {
  provider: "perplexity",
  apiKeys: { perplexity: "", openai: "", anthropic: "", gemini: "" },
  baseUrls: {
    perplexity: "",
    openai: "",
    anthropic: "",
    gemini: "",
    lmstudio: "http://localhost:1234",
  },
  models: {
    perplexity: "sonar",
    openai: "gpt-4o-mini",
    anthropic: "claude-sonnet-4-6",
    gemini: "gemini-2.0-flash",
    lmstudio: "",
  },
  temperature: 0.7,
  maxTokens: 2048,
  systemPrompt:
    "You are a helpful, accurate, and friendly AI assistant. Provide clear and concise answers. Use markdown formatting when appropriate.",
  theme: "dark",
  fontSize: 14,
  sendWithEnter: true,
  streamResponses: true,
  showSources: true,
};

// Initialize default settings on install
chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get("settings");
  if (!existing.settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  } else {
    // Migrate old single-provider schema to multi-provider
    const s = existing.settings;
    if (!s.provider) {
      s.provider = "perplexity";
      s.apiKeys = { perplexity: s.apiKey || "", openai: "", anthropic: "", gemini: "" };
      s.models = {
        perplexity: s.model || "sonar",
        openai: "gpt-4o-mini",
        anthropic: "claude-sonnet-4-6",
        gemini: "gemini-2.0-flash",
        lmstudio: "",
      };
    }
    if (!s.baseUrls) {
      s.baseUrls = {
        perplexity: "",
        openai: "",
        anthropic: "",
        gemini: "",
        lmstudio: s.lmStudioUrl || "http://localhost:1234",
      };
      delete s.lmStudioUrl;
      await chrome.storage.local.set({ settings: s });
    }
  }
  const convos = await chrome.storage.local.get("conversations");
  if (!convos.conversations) {
    await chrome.storage.local.set({
      conversations: [],
      activeConversationId: null,
    });
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "chat") {
    handleChat(request, sendResponse);
    return true;
  }
  if (request.type === "getSettings") {
    chrome.storage.local.get("settings").then((data) => {
      sendResponse(data.settings || DEFAULT_SETTINGS);
    });
    return true;
  }
});

async function handleChat(request, sendResponse) {
  try {
    const s =
      (await chrome.storage.local.get("settings")).settings || DEFAULT_SETTINGS;
    const provider = s.provider || "perplexity";
    const apiKey = s.apiKeys?.[provider] || s.apiKey || "";
    const model = s.models?.[provider] || s.model || "";

    if (provider !== "lmstudio" && !apiKey) {
      sendResponse({
        error:
          "API Key nicht konfiguriert. Bitte in den Einstellungen hinterlegen.",
      });
      return;
    }

    switch (provider) {
      case "openai":
        await callOpenAI(s, apiKey, model, request, sendResponse);
        break;
      case "anthropic":
        await callAnthropic(s, apiKey, model, request, sendResponse);
        break;
      case "gemini":
        await callGemini(s, apiKey, model, request, sendResponse);
        break;
      case "lmstudio":
        await callLMStudio(s, model, request, sendResponse);
        break;
      default:
        await callPerplexity(s, apiKey, model, request, sendResponse);
    }
  } catch (err) {
    sendResponse({ error: `Verbindungsfehler: ${err.message}` });
  }
}

function buildMessages(s, requestMessages) {
  const messages = [];
  if (s.systemPrompt) messages.push({ role: "system", content: s.systemPrompt });
  messages.push(...requestMessages);
  return messages;
}

async function callPerplexity(s, apiKey, model, request, sendResponse) {
  const messages = buildMessages(s, request.messages);
  const base = (s.baseUrls?.perplexity || "https://api.perplexity.ai").replace(/\/$/, "");
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: s.temperature,
      max_tokens: s.maxTokens,
      stream: false,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    sendResponse({
      error: `API Fehler (${response.status}): ${err.error?.message || response.statusText}`,
    });
    return;
  }
  const data = await response.json();
  sendResponse({
    content: data.choices[0].message.content,
    citations: data.citations || [],
    usage: data.usage,
  });
}

async function callOpenAI(s, apiKey, model, request, sendResponse) {
  const messages = buildMessages(s, request.messages);
  const base = (s.baseUrls?.openai || "https://api.openai.com").replace(/\/$/, "");
  const response = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: s.temperature,
      max_tokens: s.maxTokens,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    sendResponse({
      error: `API Fehler (${response.status}): ${err.error?.message || response.statusText}`,
    });
    return;
  }
  const data = await response.json();
  sendResponse({ content: data.choices[0].message.content, usage: data.usage });
}

async function callAnthropic(s, apiKey, model, request, sendResponse) {
  // Anthropic uses a separate `system` field; no "system" role in messages array
  const messages = request.messages.filter((m) => m.role !== "system");
  const body = { model, max_tokens: s.maxTokens, messages };
  if (s.systemPrompt) body.system = s.systemPrompt;

  const base = (s.baseUrls?.anthropic || "https://api.anthropic.com").replace(/\/$/, "");
  const response = await fetch(`${base}/v1/messages`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    sendResponse({
      error: `API Fehler (${response.status}): ${err.error?.message || response.statusText}`,
    });
    return;
  }
  const data = await response.json();
  sendResponse({ content: data.content[0].text, usage: data.usage });
}

async function callGemini(s, apiKey, model, request, sendResponse) {
  // Gemini uses `contents` with role "user"/"model"
  const contents = request.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const body = {
    contents,
    generationConfig: {
      temperature: s.temperature,
      maxOutputTokens: s.maxTokens,
    },
  };
  if (s.systemPrompt) {
    body.systemInstruction = { parts: [{ text: s.systemPrompt }] };
  }

  const base = (s.baseUrls?.gemini || "https://generativelanguage.googleapis.com").replace(/\/$/, "");
  const response = await fetch(
    `${base}/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    sendResponse({
      error: `API Fehler (${response.status}): ${err.error?.message || response.statusText}`,
    });
    return;
  }
  const data = await response.json();
  sendResponse({
    content: data.candidates[0].content.parts[0].text,
  });
}

async function callLMStudio(s, model, request, sendResponse) {
  const baseUrl = (s.baseUrls?.lmstudio || "http://localhost:1234").replace(/\/$/, "");
  const messages = buildMessages(s, request.messages);
  const body = {
    messages,
    temperature: s.temperature,
    max_tokens: s.maxTokens,
    stream: false,
  };
  if (model) body.model = model;

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    sendResponse({
      error: `LM Studio Fehler (${response.status}): ${err.error?.message || response.statusText}`,
    });
    return;
  }
  const data = await response.json();
  sendResponse({ content: data.choices[0].message.content, usage: data.usage });
}
