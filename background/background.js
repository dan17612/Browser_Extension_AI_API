// Background service worker for AI Chat Pro

const PROVIDER_PRESETS = {
  perplexity: {
    endpoint: "https://api.perplexity.ai/chat/completions",
    model: "sonar",
    requiresApiKey: true,
    isLocal: false,
  },
  openai: {
    endpoint: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4.1-mini",
    requiresApiKey: true,
    isLocal: false,
  },
  anthropic: {
    endpoint: "https://api.anthropic.com/v1/messages",
    model: "claude-3-5-sonnet-latest",
    requiresApiKey: true,
    isLocal: false,
  },
  lmstudio: {
    endpoint: "http://127.0.0.1:1234/v1/chat/completions",
    model: "local-model",
    requiresApiKey: false,
    isLocal: true,
  },
  ollama: {
    endpoint: "http://127.0.0.1:11434/v1/chat/completions",
    model: "llama3.1",
    requiresApiKey: false,
    isLocal: true,
  },
  custom: {
    endpoint: "",
    model: "",
    requiresApiKey: true,
    isLocal: false,
  },
};

const DEFAULT_SETTINGS = {
  activeProfileId: "default",
  profiles: [
    {
      id: "default",
      name: "Perplexity",
      provider: "perplexity",
      endpoint: PROVIDER_PRESETS.perplexity.endpoint,
      model: PROVIDER_PRESETS.perplexity.model,
      apiKey: "",
      requiresApiKey: true,
      isLocal: false,
    },
  ],
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

function migrateSettings(raw) {
  const merged = {
    ...DEFAULT_SETTINGS,
    ...(raw || {}),
  };

  if (!Array.isArray(merged.profiles) || merged.profiles.length === 0) {
    merged.profiles = [
      {
        ...DEFAULT_SETTINGS.profiles[0],
        apiKey: raw?.apiKey || "",
        model: raw?.model || DEFAULT_SETTINGS.profiles[0].model,
      },
    ];
    merged.activeProfileId = "default";
  }

  merged.profiles = merged.profiles.map((profile, index) => {
    const provider = profile.provider || "perplexity";
    const preset = PROVIDER_PRESETS[provider] || PROVIDER_PRESETS.custom;
    return {
      id: profile.id || `profile-${index + 1}`,
      name: profile.name || provider,
      provider,
      endpoint: profile.endpoint || preset.endpoint,
      model: profile.model || preset.model,
      apiKey: profile.apiKey || "",
      requiresApiKey:
        typeof profile.requiresApiKey === "boolean"
          ? profile.requiresApiKey
          : preset.requiresApiKey,
      isLocal:
        typeof profile.isLocal === "boolean" ? profile.isLocal : preset.isLocal,
    };
  });

  if (!merged.profiles.some((p) => p.id === merged.activeProfileId)) {
    merged.activeProfileId = merged.profiles[0].id;
  }

  return merged;
}

function getActiveProfile(settings) {
  return (
    settings.profiles.find((p) => p.id === settings.activeProfileId) ||
    settings.profiles[0] ||
    null
  );
}

function buildOpenAIRequest(profile, settings, messages) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (profile.requiresApiKey && profile.apiKey) {
    headers.Authorization = `Bearer ${profile.apiKey}`;
  }

  return {
    endpoint: profile.endpoint,
    headers,
    body: {
      model: profile.model,
      messages,
      temperature: settings.temperature,
      max_tokens: settings.maxTokens,
      stream: false,
    },
  };
}

function buildAnthropicRequest(profile, settings, messages) {
  const systemText = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const chatMessages = messages.filter((m) => m.role !== "system");

  const headers = {
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01",
  };

  if (profile.apiKey) {
    headers["x-api-key"] = profile.apiKey;
  }

  const body = {
    model: profile.model,
    max_tokens: settings.maxTokens,
    temperature: settings.temperature,
    messages: chatMessages,
  };

  if (systemText) body.system = systemText;

  return {
    endpoint: profile.endpoint,
    headers,
    body,
  };
}

function extractAssistantText(provider, data) {
  if (provider === "anthropic") {
    const parts = Array.isArray(data.content) ? data.content : [];
    const text = parts
      .filter((part) => part && part.type === "text")
      .map((part) => part.text)
      .join("\n");
    return text || "";
  }

  return data?.choices?.[0]?.message?.content || "";
}

function extractUsage(provider, data) {
  if (provider === "anthropic") {
    return data.usage || null;
  }
  return data.usage || null;
}

function extractErrorMessage(errData, fallback) {
  return (
    errData?.error?.message ||
    errData?.error ||
    errData?.message ||
    fallback ||
    "Unbekannter Fehler"
  );
}

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get("settings");
  const migratedSettings = migrateSettings(existing.settings);
  await chrome.storage.local.set({ settings: migratedSettings });

  const convos = await chrome.storage.local.get("conversations");
  if (!convos.conversations) {
    await chrome.storage.local.set({
      conversations: [],
      activeConversationId: null,
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "chat") {
    handleChat(request, sendResponse);
    return true;
  }
  if (request.type === "getSettings") {
    chrome.storage.local.get("settings").then((data) => {
      const migrated = migrateSettings(data.settings);
      sendResponse(migrated);
    });
    return true;
  }
});

async function handleChat(request, sendResponse) {
  try {
    const rawSettings = (await chrome.storage.local.get("settings")).settings;
    const settings = migrateSettings(rawSettings);
    const profile = getActiveProfile(settings);

    if (!profile) {
      sendResponse({ error: "Kein Profil konfiguriert." });
      return;
    }

    if (!profile.endpoint) {
      sendResponse({ error: "API Endpoint fehlt im aktiven Profil." });
      return;
    }

    if (profile.requiresApiKey && !profile.apiKey) {
      sendResponse({
        error:
          "API Token/Key nicht konfiguriert. Bitte im aktiven Profil hinterlegen.",
      });
      return;
    }

    const messages = [];
    if (settings.systemPrompt) {
      messages.push({ role: "system", content: settings.systemPrompt });
    }
    messages.push(...request.messages);

    const apiRequest =
      profile.provider === "anthropic"
        ? buildAnthropicRequest(profile, settings, messages)
        : buildOpenAIRequest(profile, settings, messages);

    const response = await fetch(apiRequest.endpoint, {
      method: "POST",
      headers: apiRequest.headers,
      body: JSON.stringify(apiRequest.body),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      sendResponse({
        error: `API Fehler (${response.status}): ${extractErrorMessage(errData, response.statusText)}`,
      });
      return;
    }

    const data = await response.json();
    const content = extractAssistantText(profile.provider, data);

    sendResponse({
      content,
      citations: data.citations || [],
      usage: extractUsage(profile.provider, data),
    });
  } catch (err) {
    sendResponse({ error: `Verbindungsfehler: ${err.message}` });
  }
}