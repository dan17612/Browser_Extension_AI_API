// ============================================
// AI Chat Pro - Settings Page Logic
// ============================================

(function () {
  "use strict";

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

  let settings = { ...DEFAULT_SETTINGS };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ---- DOM ----
  const dom = {
    app: $("#app"),
    apiKey: $("#api-key"),
    toggleKeyVis: $("#toggle-key-visibility"),
    btnTestApi: $("#btn-test-api"),
    apiTestResult: $("#api-test-result"),
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
    // Theme
    applyTheme();
    const themeRadio = $(`input[name="theme"][value="${settings.theme}"]`);
    if (themeRadio) themeRadio.checked = true;

    // API Key
    dom.apiKey.value = settings.apiKey;

    // Model
    const modelRadio = $(`input[name="model"][value="${settings.model}"]`);
    if (modelRadio) modelRadio.checked = true;

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

  function applyTheme() {
    const theme =
      settings.theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : settings.theme;
    dom.app.className = `theme-${theme}`;
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

    // API Key
    dom.apiKey.addEventListener("change", () => {
      settings.apiKey = dom.apiKey.value.trim();
      saveSettings();
    });

    // Toggle key visibility
    dom.toggleKeyVis.addEventListener("click", () => {
      const isPassword = dom.apiKey.type === "password";
      dom.apiKey.type = isPassword ? "text" : "password";
    });

    // Test API
    dom.btnTestApi.addEventListener("click", testApi);

    // Model
    $$('input[name="model"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        settings.model = radio.value;
        saveSettings();
      });
    });

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
    const key = dom.apiKey.value.trim();
    if (!key) {
      showTestResult("Bitte gib zuerst einen API Key ein.", "error");
      return;
    }

    dom.btnTestApi.disabled = true;
    dom.btnTestApi.innerHTML = '<span class="loading">Teste...</span>';

    try {
      const response = await fetch(
        "https://api.perplexity.ai/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "sonar",
            messages: [{ role: "user", content: "Hello" }],
            max_tokens: 10,
          }),
        },
      );

      if (response.ok) {
        showTestResult(
          "Verbindung erfolgreich! API Key ist gultig.",
          "success",
        );
      } else {
        const err = await response.json().catch(() => ({}));
        showTestResult(
          `Fehler (${response.status}): ${err.error?.message || response.statusText}`,
          "error",
        );
      }
    } catch (err) {
      showTestResult(`Verbindungsfehler: ${err.message}`, "error");
    } finally {
      dom.btnTestApi.disabled = false;
      dom.btnTestApi.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> API testen`;
    }
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
      {
        exportedAt: new Date().toISOString(),
        conversations: convos,
      },
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
        "Alle Chats wirklich loschen? Diese Aktion kann nicht ruckgangig gemacht werden.",
      )
    )
      return;

    await chrome.storage.local.set({
      conversations: [],
      activeConversationId: null,
    });
    loadStats();
    alert("Alle Chats wurden geloscht.");
  }

  async function resetSettings() {
    if (!confirm("Einstellungen wirklich zurucksetzen?")) return;

    settings = { ...DEFAULT_SETTINGS };
    await saveSettings();
    populateUI();
    alert("Einstellungen wurden zuruckgesetzt.");
  }

  // ---- Start ----
  init();
})();
