// Background service worker for AI Chat Pro

const DEFAULT_SETTINGS = {
  apiKey: "",
  model: "sonar",
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
    return true; // Keep channel open for async response
  }
  if (request.type === "chat-stream") {
    handleStreamChat(request, sender.tab);
    sendResponse({ status: "streaming" });
    return false;
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
    const settings =
      (await chrome.storage.local.get("settings")).settings || DEFAULT_SETTINGS;

    if (!settings.apiKey) {
      sendResponse({
        error:
          "API Key nicht konfiguriert. Bitte in den Einstellungen hinterlegen.",
      });
      return;
    }

    const messages = [];
    if (settings.systemPrompt) {
      messages.push({ role: "system", content: settings.systemPrompt });
    }
    messages.push(...request.messages);

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: settings.model,
        messages: messages,
        temperature: settings.temperature,
        max_tokens: settings.maxTokens,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      sendResponse({
        error: `API Fehler (${response.status}): ${errData.error?.message || response.statusText}`,
      });
      return;
    }

    const data = await response.json();
    sendResponse({
      content: data.choices[0].message.content,
      citations: data.citations || [],
      usage: data.usage,
    });
  } catch (err) {
    sendResponse({ error: `Verbindungsfehler: ${err.message}` });
  }
}
