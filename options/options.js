// ============================================
// AI Chat Pro - Settings Page Logic
// ============================================

(function () {
  "use strict";

  const DEFAULT_SETTINGS = {
    provider: "perplexity",
    apiKeys: {
      perplexity: "",
      openai: "",
      anthropic: "",
      gemini: "",
      lmstudio: "",
    },
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

  const PROVIDER_CONFIG = {
    perplexity: {
      keyLabel: "Perplexity API Key",
      placeholder: "pplx-xxxxxxxxxxxxxxxxxxxx",
      helpUrl: "https://docs.perplexity.ai/docs/getting-started/overview",
      models: [
        { value: "sonar", label: "Sonar – Schnell & effizient" },
        { value: "sonar-pro", label: "Sonar Pro – Höhere Qualität" },
        {
          value: "sonar-reasoning",
          label: "Sonar Reasoning – Logisches Denken",
        },
        {
          value: "sonar-reasoning-pro",
          label: "Sonar Reasoning Pro – Beste Qualität",
        },
      ],
    },
    openai: {
      keyLabel: "OpenAI API Key",
      placeholder: "sk-xxxxxxxxxxxxxxxxxxxx",
      helpUrl: "https://platform.openai.com/api-keys",
      models: [
        { value: "gpt-4o", label: "GPT-4o – Neuestes Modell" },
        { value: "gpt-4o-mini", label: "GPT-4o Mini – Schnell & günstig" },
        { value: "gpt-4-turbo", label: "GPT-4 Turbo – Hohe Qualität" },
        { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo – Kostengünstig" },
      ],
    },
    anthropic: {
      keyLabel: "Anthropic API Key",
      placeholder: "sk-ant-xxxxxxxxxxxxxxxxxxxx",
      helpUrl: "https://console.anthropic.com/settings/keys",
      models: [
        {
          value: "claude-opus-4-6",
          label: "Claude Opus 4.6 – Stärkste Fähigkeiten",
        },
        { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 – Ausgewogen" },
        {
          value: "claude-haiku-4-5-20251001",
          label: "Claude Haiku 4.5 – Schnell & effizient",
        },
      ],
    },
    gemini: {
      keyLabel: "Google API Key",
      placeholder: "AIzaSy-xxxxxxxxxxxxxxxxxxxx",
      helpUrl: "https://aistudio.google.com/app/apikey",
      models: [
        {
          value: "gemini-2.0-flash",
          label: "Gemini 2.0 Flash – Schnell & aktuell",
        },
        { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro – Hohe Qualität" },
        {
          value: "gemini-1.5-flash",
          label: "Gemini 1.5 Flash – Schnell & effizient",
        },
      ],
    },
    lmstudio: {
      keyLabel: "LM Studio API Key (optional)",
      placeholder: "lm-studio-key-optional",
      helpUrl: null,
      keyHint:
        "Optional. Wird nur gesendet, wenn dein LM-Studio-Server eine Authentifizierung erwartet.",
      models: [],
    },
  };

  let settings = { ...DEFAULT_SETTINGS };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ---- DOM ----
  const dom = {
    app: $("#app"),
    providerSelect: $("#provider-select"),
    apiKeyGroup: $("#api-key-group"),
    apiKeyLabel: $("#api-key-label"),
    apiKeyHelp: $("#api-key-help"),
    apiKey: $("#api-key"),
    apiKeyHint: $("#api-key-hint"),
    toggleKeyVis: $("#toggle-key-visibility"),
    lmStudioUrlGroup: $("#lmstudio-url-group"),
    lmStudioUrl: $("#lmstudio-url"),
    advancedUrlGroup: $("#advanced-url-group"),
    baseUrl: $("#base-url"),
    btnTestApi: $("#btn-test-api"),
    apiTestResult: $("#api-test-result"),
    modelSelect: $("#model-select"),
    lmStudioModelGroup: $("#lmstudio-model-group"),
    lmStudioModel: $("#lmstudio-model"),
    lmStudioModelHint: $("#lmstudio-model-hint"),
    btnLoadModels: $("#btn-load-models"),
    temperature: $("#temperature"),
    temperatureValue: $("#temperature-value"),
    maxTokens: $("#max-tokens"),
    maxTokensValue: $("#max-tokens-value"),
    systemPrompt: $("#system-prompt"),
    fontSize: $("#font-size"),
    fontSizeValue: $("#font-size-value"),
    sendWithEnter: $("#send-with-enter"),
    showSources: $("#show-sources"),
    saveStatus: $("#save-status"),
    statConversations: $("#stat-conversations"),
    statMessages: $("#stat-messages"),
    btnExportAll: $("#btn-export-all"),
    btnClearAll: $("#btn-clear-all"),
    btnResetSettings: $("#btn-reset-settings"),
  };

  // ---- Init ----
  async function init() {
    await loadSettings();
    populateUI();
    bindEvents();
    loadStats();
  }

  async function loadSettings() {
    const data = await chrome.storage.local.get("settings");
    settings = data.settings || { ...DEFAULT_SETTINGS };
    // Migrate legacy schema
    if (!settings.provider) {
      settings.provider = "perplexity";
      settings.apiKeys = {
        perplexity: settings.apiKey || "",
        openai: "",
        anthropic: "",
        gemini: "",
        lmstudio: "",
      };
      settings.models = {
        perplexity: settings.model || "sonar",
        openai: "gpt-4o-mini",
        anthropic: "claude-sonnet-4-6",
        gemini: "gemini-2.0-flash",
        lmstudio: "",
      };
    }
    if (!settings.baseUrls) {
      settings.baseUrls = {
        perplexity: "",
        openai: "",
        anthropic: "",
        gemini: "",
        lmstudio: settings.lmStudioUrl || "http://localhost:1234",
      };
      delete settings.lmStudioUrl;
    }
    // Ensure nested objects exist
    settings.apiKeys = {
      ...DEFAULT_SETTINGS.apiKeys,
      ...(settings.apiKeys || {}),
    };
    settings.models = settings.models || DEFAULT_SETTINGS.models;
    settings.baseUrls = settings.baseUrls || { ...DEFAULT_SETTINGS.baseUrls };
  }

  async function saveSettings() {
    await chrome.storage.local.set({ settings });
    showSaveStatus();
  }

  function showSaveStatus() {
    dom.saveStatus.classList.remove("hidden");
    clearTimeout(showSaveStatus._timer);
    showSaveStatus._timer = setTimeout(() => {
      dom.saveStatus.classList.add("hidden");
    }, 2000);
  }

  // ---- Populate UI ----
  function populateUI() {
    applyTheme();

    // Theme
    const themeRadio = $(`input[name="theme"][value="${settings.theme}"]`);
    if (themeRadio) themeRadio.checked = true;

    // Provider
    dom.providerSelect.value = settings.provider || "perplexity";
    updateProviderUI(settings.provider || "perplexity");

    // Temperature
    dom.temperature.value = settings.temperature;
    dom.temperatureValue.textContent = settings.temperature;

    // Max Tokens
    dom.maxTokens.value = settings.maxTokens;
    dom.maxTokensValue.textContent = settings.maxTokens;

    // System Prompt
    dom.systemPrompt.value = settings.systemPrompt;

    // Font Size
    dom.fontSize.value = settings.fontSize;
    dom.fontSizeValue.textContent = settings.fontSize + "px";

    // Toggles
    dom.sendWithEnter.checked = settings.sendWithEnter;
    dom.showSources.checked = settings.showSources;
  }

  async function loadLmStudioModels() {
    const baseUrl = (
      dom.lmStudioUrl.value.trim() ||
      settings.baseUrls?.lmstudio ||
      "http://localhost:1234"
    ).replace(/\/$/, "");
    const apiKey = dom.apiKey.value.trim() || settings.apiKeys?.lmstudio || "";

    dom.btnLoadModels.disabled = true;
    dom.btnLoadModels.style.opacity = "0.5";
    dom.lmStudioModelHint.textContent = "Lade Modelle...";

    try {
      const response = await fetch(`${baseUrl}/v1/models`, {
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      });
      if (!response.ok)
        throw new Error(`Server antwortete mit ${response.status}`);

      const data = await response.json();
      const models = (data.data || []).map((m) => m.id).filter(Boolean);

      if (models.length === 0) {
        dom.lmStudioModelHint.textContent =
          "Keine Modelle gefunden. Bitte ein Modell in LM Studio laden.";
        return;
      }

      const current = settings.models?.lmstudio || "";
      dom.lmStudioModel.innerHTML = models
        .map(
          (id) =>
            `<option value="${id}" ${id === current ? "selected" : ""}>${id}</option>`,
        )
        .join("");

      // Auto-select first if nothing was saved yet
      if (!current || !models.includes(current)) {
        settings.models.lmstudio = models[0];
        dom.lmStudioModel.value = models[0];
        saveSettings();
      }

      dom.lmStudioModelHint.textContent = `${models.length} Modell${models.length !== 1 ? "e" : ""} gefunden.`;
    } catch (err) {
      dom.lmStudioModelHint.textContent = `Verbindungsfehler: ${err.message} — LM Studio gestartet?`;
    } finally {
      dom.btnLoadModels.disabled = false;
      dom.btnLoadModels.style.opacity = "";
    }
  }

  function updateProviderUI(provider) {
    const cfg = PROVIDER_CONFIG[provider];
    const isLmStudio = provider === "lmstudio";

    // API key group + URL groups
    if (isLmStudio) {
      dom.apiKeyGroup.classList.remove("hidden");
      dom.lmStudioUrlGroup.classList.remove("hidden");
      dom.advancedUrlGroup.classList.add("hidden");
      dom.apiKeyLabel.textContent = cfg.keyLabel;
      dom.apiKey.placeholder = cfg.placeholder;
      dom.apiKey.type = "password";
      dom.apiKey.value = settings.apiKeys?.lmstudio || "";
      dom.apiKeyHint.textContent = cfg.keyHint;
      dom.apiKeyHelp.style.display = "none";
      dom.lmStudioUrl.value =
        settings.baseUrls?.lmstudio || "http://localhost:1234";
    } else {
      dom.apiKeyGroup.classList.remove("hidden");
      dom.lmStudioUrlGroup.classList.add("hidden");
      dom.advancedUrlGroup.classList.remove("hidden");
      dom.advancedUrlGroup.removeAttribute("open");
      dom.apiKeyLabel.textContent = cfg.keyLabel;
      dom.apiKey.placeholder = cfg.placeholder;
      dom.apiKey.type = "password";
      dom.apiKey.value = settings.apiKeys?.[provider] || "";
      dom.apiKeyHint.textContent =
        "Dein API Key wird lokal in der Extension gespeichert und nie an Dritte weitergegeben.";
      const storedUrl = settings.baseUrls?.[provider] || "";
      dom.baseUrl.value = storedUrl;
      dom.baseUrl.placeholder =
        {
          perplexity: "https://api.perplexity.ai",
          openai: "https://api.openai.com",
          anthropic: "https://api.anthropic.com",
          gemini: "https://generativelanguage.googleapis.com",
        }[provider] || "";
      if (cfg.helpUrl) {
        dom.apiKeyHelp.href = cfg.helpUrl;
        dom.apiKeyHelp.style.display = "";
      } else {
        dom.apiKeyHelp.style.display = "none";
      }
    }

    // Model select
    if (isLmStudio) {
      dom.modelSelect.classList.add("hidden");
      dom.lmStudioModelGroup.classList.remove("hidden");
      // Restore previously saved model if available
      const saved = settings.models?.lmstudio || "";
      if (saved) {
        dom.lmStudioModel.innerHTML = `<option value="${saved}" selected>${saved}</option>`;
      }
      // Always try to fetch fresh model list
      loadLmStudioModels();
    } else {
      dom.modelSelect.classList.remove("hidden");
      dom.lmStudioModelGroup.classList.add("hidden");
      dom.modelSelect.innerHTML = cfg.models
        .map((m) => `<option value="${m.value}">${m.label}</option>`)
        .join("");
      dom.modelSelect.value =
        settings.models?.[provider] || cfg.models[0]?.value || "";
    }
  }

  function applyTheme() {
    const theme =
      settings.theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : settings.theme;
    dom.app.className = `theme-${theme}`;
    document.body.className = `theme-${theme}`;
    localStorage.setItem("ai-chat-theme", theme);
  }

  // ---- Events ----
  function bindEvents() {
    // Tab Navigation
    $$(".nav-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        $$(".nav-item").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        $$(".settings-section").forEach((s) => s.classList.remove("active"));
        $(`#section-${btn.dataset.section}`).classList.add("active");
      });
    });

    // Provider
    dom.providerSelect.addEventListener("change", () => {
      settings.provider = dom.providerSelect.value;
      updateProviderUI(settings.provider);
      saveSettings();
    });

    // API Key
    dom.apiKey.addEventListener("change", () => {
      settings.apiKeys[settings.provider] = dom.apiKey.value.trim();
      saveSettings();
    });

    // Toggle key visibility
    dom.toggleKeyVis.addEventListener("click", () => {
      dom.apiKey.type = dom.apiKey.type === "password" ? "text" : "password";
    });

    // LM Studio URL
    dom.lmStudioUrl.addEventListener("change", () => {
      settings.baseUrls.lmstudio =
        dom.lmStudioUrl.value.trim() || "http://localhost:1234";
      saveSettings();
    });

    // Base URL override for known providers
    dom.baseUrl.addEventListener("change", () => {
      settings.baseUrls[settings.provider] = dom.baseUrl.value.trim();
      saveSettings();
    });

    // Test API
    dom.btnTestApi.addEventListener("click", testApi);

    // Model select
    dom.modelSelect.addEventListener("change", () => {
      settings.models[settings.provider] = dom.modelSelect.value;
      saveSettings();
    });

    // LM Studio model
    dom.lmStudioModel.addEventListener("change", () => {
      settings.models.lmstudio = dom.lmStudioModel.value;
      saveSettings();
    });

    // Load models button
    dom.btnLoadModels.addEventListener("click", loadLmStudioModels);

    // Temperature
    dom.temperature.addEventListener("input", () => {
      settings.temperature = parseFloat(dom.temperature.value);
      dom.temperatureValue.textContent = settings.temperature;
      saveSettings();
    });

    // Max Tokens
    dom.maxTokens.addEventListener("input", () => {
      settings.maxTokens = parseInt(dom.maxTokens.value);
      dom.maxTokensValue.textContent = settings.maxTokens;
      saveSettings();
    });

    // System Prompt
    dom.systemPrompt.addEventListener("change", () => {
      settings.systemPrompt = dom.systemPrompt.value;
      saveSettings();
    });

    // Theme
    $$('input[name="theme"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        settings.theme = radio.value;
        applyTheme();
        saveSettings();
      });
    });

    // Font Size
    dom.fontSize.addEventListener("input", () => {
      settings.fontSize = parseInt(dom.fontSize.value);
      dom.fontSizeValue.textContent = settings.fontSize + "px";
      saveSettings();
    });

    // Toggles
    dom.sendWithEnter.addEventListener("change", () => {
      settings.sendWithEnter = dom.sendWithEnter.checked;
      saveSettings();
    });
    dom.showSources.addEventListener("change", () => {
      settings.showSources = dom.showSources.checked;
      saveSettings();
    });

    // Export All
    dom.btnExportAll.addEventListener("click", exportAllChats);

    // Clear All
    dom.btnClearAll.addEventListener("click", clearAllChats);

    // Reset Settings
    dom.btnResetSettings.addEventListener("click", resetSettings);

    // System theme change
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", () => {
        if (settings.theme === "system") applyTheme();
      });
  }

  // ---- API Test ----
  async function testApi() {
    const provider = settings.provider || "perplexity";
    const key = dom.apiKey.value.trim();

    if (provider !== "lmstudio" && !key) {
      showTestResult("Bitte gib zuerst einen API Key ein.", "error");
      return;
    }

    dom.btnTestApi.disabled = true;
    dom.btnTestApi.innerHTML = '<span class="loading">Teste...</span>';

    try {
      let ok = false;
      let errMsg = "";

      if (provider === "perplexity") {
        const r = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "sonar",
            messages: [{ role: "user", content: "Hi" }],
            max_tokens: 5,
          }),
        });
        ok = r.ok;
        if (!ok) errMsg = await extractError(r);
      } else if (provider === "openai") {
        const r = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: "Hi" }],
            max_tokens: 5,
          }),
        });
        ok = r.ok;
        if (!ok) errMsg = await extractError(r);
      } else if (provider === "anthropic") {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 5,
            messages: [{ role: "user", content: "Hi" }],
          }),
        });
        ok = r.ok;
        if (!ok) errMsg = await extractError(r);
      } else if (provider === "gemini") {
        const model = "gemini-2.0-flash";
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: "Hi" }] }],
              generationConfig: { maxOutputTokens: 5 },
            }),
          },
        );
        ok = r.ok;
        if (!ok) errMsg = await extractError(r);
      } else if (provider === "lmstudio") {
        const baseUrl = (
          dom.lmStudioUrl.value.trim() ||
          settings.baseUrls?.lmstudio ||
          "http://localhost:1234"
        ).replace(/\/$/, "");
        const headers = key ? { Authorization: `Bearer ${key}` } : {};
        const r = await fetch(`${baseUrl}/v1/models`, { headers });
        ok = r.ok;
        if (!ok) errMsg = `Server nicht erreichbar (${r.status})`;
      }

      if (ok) {
        showTestResult(
          provider === "lmstudio"
            ? key
              ? "Verbindung erfolgreich. Optionaler API Key wurde akzeptiert."
              : "Verbindung erfolgreich. LM Studio ist ohne API Key erreichbar."
            : "Verbindung erfolgreich! API Key ist gültig.",
          "success",
        );
      } else {
        showTestResult(`Fehler: ${errMsg}`, "error");
      }
    } catch (err) {
      showTestResult(`Verbindungsfehler: ${err.message}`, "error");
    } finally {
      dom.btnTestApi.disabled = false;
      dom.btnTestApi.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> API testen`;
    }
  }

  async function extractError(response) {
    const data = await response.json().catch(() => ({}));
    return `(${response.status}): ${data.error?.message || response.statusText}`;
  }

  function showTestResult(message, type) {
    dom.apiTestResult.textContent = message;
    dom.apiTestResult.className = `test-result ${type}`;
  }

  // ---- Data Operations ----
  async function loadStats() {
    const data = await chrome.storage.local.get("conversations");
    const convos = data.conversations || [];
    const totalMessages = convos.reduce((sum, c) => sum + c.messages.length, 0);
    dom.statConversations.textContent = convos.length;
    dom.statMessages.textContent = totalMessages;
  }

  async function exportAllChats() {
    const data = await chrome.storage.local.get("conversations");
    const convos = data.conversations || [];
    if (convos.length === 0) {
      alert("Keine Chats zum Exportieren.");
      return;
    }
    const content = JSON.stringify(
      { exportedAt: new Date().toISOString(), conversations: convos },
      null,
      2,
    );
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-chat-pro-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function clearAllChats() {
    if (
      !confirm(
        "Alle Chats wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.",
      )
    )
      return;
    await chrome.storage.local.set({
      conversations: [],
      activeConversationId: null,
    });
    loadStats();
    alert("Alle Chats wurden gelöscht.");
  }

  async function resetSettings() {
    if (!confirm("Einstellungen wirklich zurücksetzen?")) return;
    settings = {
      ...DEFAULT_SETTINGS,
      apiKeys: { ...DEFAULT_SETTINGS.apiKeys },
      models: { ...DEFAULT_SETTINGS.models },
    };
    await saveSettings();
    populateUI();
    alert("Einstellungen wurden zurückgesetzt.");
  }

  // ---- Start ----
  init();
})();
