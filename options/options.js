// ============================================
// AI Chat Pro - Settings Page Logic
// ============================================

(function () {
  "use strict";

  const PROVIDER_PRESETS = {
    perplexity: {
      label: "Perplexity",
      docsUrl: "https://docs.perplexity.ai/docs/getting-started/overview",
      endpoint: "https://api.perplexity.ai/chat/completions",
      model: "sonar",
      requiresApiKey: true,
      isLocal: false,
    },
    openai: {
      label: "OpenAI",
      docsUrl: "https://platform.openai.com/docs/quickstart",
      endpoint: "https://api.openai.com/v1/chat/completions",
      model: "gpt-4.1-mini",
      requiresApiKey: true,
      isLocal: false,
    },
    anthropic: {
      label: "Anthropic",
      docsUrl: "https://docs.anthropic.com/en/api/messages",
      endpoint: "https://api.anthropic.com/v1/messages",
      model: "claude-3-5-sonnet-latest",
      requiresApiKey: true,
      isLocal: false,
    },
    lmstudio: {
      label: "LM Studio (lokal)",
      docsUrl: "https://lmstudio.ai/docs/app/api/endpoints/openai",
      endpoint: "http://127.0.0.1:1234/v1/chat/completions",
      model: "local-model",
      requiresApiKey: false,
      isLocal: true,
    },
    ollama: {
      label: "Ollama (lokal)",
      docsUrl: "https://github.com/ollama/ollama/blob/main/docs/openai.md",
      endpoint: "http://127.0.0.1:11434/v1/chat/completions",
      model: "llama3.1",
      requiresApiKey: false,
      isLocal: true,
    },
    custom: {
      label: "Custom",
      docsUrl: "",
      endpoint: "",
      model: "",
      requiresApiKey: true,
      isLocal: false,
    },
  };

  const DEFAULT_PROFILE_PROVIDER = "perplexity";

  const DEFAULT_SETTINGS = {
    activeProfileId: "default",
    profiles: [createProfileFromProvider(DEFAULT_PROFILE_PROVIDER, "default")],
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

  const dom = {
    app: $("#app"),
    profileSelect: $("#profile-select"),
    btnNewProfile: $("#btn-new-profile"),
    btnDeleteProfile: $("#btn-delete-profile"),
    profileName: $("#profile-name"),
    provider: $("#provider"),
    endpoint: $("#endpoint"),
    modelName: $("#model-name"),
    apiKey: $("#api-key"),
    providerDocsLink: $("#provider-docs-link"),
    apiKeyHint: $("#api-key-hint"),
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

  async function init() {
    await loadSettings();
    populateUI();
    bindEvents();
    loadStats();
  }

  function createProfileFromProvider(provider, id) {
    const preset = PROVIDER_PRESETS[provider] || PROVIDER_PRESETS.custom;
    return {
      id: id || generateId(),
      name: preset.label,
      provider,
      endpoint: preset.endpoint,
      model: preset.model,
      apiKey: "",
      requiresApiKey: preset.requiresApiKey,
      isLocal: preset.isLocal,
    };
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function migrateSettings(raw) {
    const merged = {
      ...DEFAULT_SETTINGS,
      ...(raw || {}),
    };

    if (!Array.isArray(merged.profiles) || merged.profiles.length === 0) {
      const legacyProvider = "perplexity";
      merged.profiles = [
        {
          ...createProfileFromProvider(legacyProvider, "default"),
          name: "Perplexity",
          model: raw?.model || PROVIDER_PRESETS.perplexity.model,
          apiKey: raw?.apiKey || "",
        },
      ];
      merged.activeProfileId = "default";
    }

    merged.profiles = merged.profiles.map((profile, index) => {
      const provider = profile.provider || DEFAULT_PROFILE_PROVIDER;
      const preset = PROVIDER_PRESETS[provider] || PROVIDER_PRESETS.custom;
      return {
        id: profile.id || `profile-${index + 1}`,
        name: profile.name || preset.label,
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

  async function loadSettings() {
    const data = await chrome.storage.local.get("settings");
    settings = migrateSettings(data.settings);
    await chrome.storage.local.set({ settings });
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

  function getActiveProfile() {
    return settings.profiles.find((p) => p.id === settings.activeProfileId) || null;
  }

  function updateProfileSelect() {
    dom.profileSelect.innerHTML = settings.profiles
      .map(
        (profile) =>
          `<option value="${profile.id}">${escapeHtml(profile.name)}</option>`,
      )
      .join("");
    dom.profileSelect.value = settings.activeProfileId;
  }

  function populateActiveProfileFields() {
    const profile = getActiveProfile();
    if (!profile) return;

    dom.profileName.value = profile.name;
    dom.provider.value = profile.provider;
    dom.endpoint.value = profile.endpoint;
    dom.modelName.value = profile.model;
    dom.apiKey.value = profile.apiKey;

    const preset = PROVIDER_PRESETS[profile.provider] || PROVIDER_PRESETS.custom;
    if (preset.docsUrl) {
      dom.providerDocsLink.href = preset.docsUrl;
      dom.providerDocsLink.style.display = "inline-flex";
    } else {
      dom.providerDocsLink.href = "#";
      dom.providerDocsLink.style.display = "none";
    }

    if (profile.requiresApiKey) {
      dom.apiKey.disabled = false;
      dom.apiKeyHint.textContent =
        "Token wird lokal in der Extension gespeichert.";
    } else {
      dom.apiKey.disabled = true;
      dom.apiKey.value = "";
      profile.apiKey = "";
      dom.apiKeyHint.textContent =
        "Fur lokale Anbieter ist meist kein Token notwendig.";
    }

    dom.btnDeleteProfile.disabled = settings.profiles.length <= 1;
  }

  function populateUI() {
    applyTheme();
    const themeRadio = $(`input[name="theme"][value="${settings.theme}"]`);
    if (themeRadio) themeRadio.checked = true;

    updateProfileSelect();
    populateActiveProfileFields();

    dom.temperature.value = settings.temperature;
    dom.temperatureValue.textContent = settings.temperature;

    dom.maxTokens.value = settings.maxTokens;
    dom.maxTokensValue.textContent = settings.maxTokens;

    dom.systemPrompt.value = settings.systemPrompt;

    dom.fontSize.value = settings.fontSize;
    dom.fontSizeValue.textContent = settings.fontSize + "px";

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
    document.body.className = `theme-${theme}`;
    localStorage.setItem("ai-chat-theme", theme);
  }

  function updateActiveProfile(mutator) {
    const profileIndex = settings.profiles.findIndex(
      (p) => p.id === settings.activeProfileId,
    );
    if (profileIndex === -1) return;
    mutator(settings.profiles[profileIndex]);
    saveSettings();
  }

  function bindEvents() {
    $$(".nav-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        $$(".nav-item").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        $$(".settings-section").forEach((s) => s.classList.remove("active"));
        $(`#section-${btn.dataset.section}`).classList.add("active");
      });
    });

    dom.profileSelect.addEventListener("change", () => {
      settings.activeProfileId = dom.profileSelect.value;
      populateActiveProfileFields();
      saveSettings();
    });

    dom.btnNewProfile.addEventListener("click", async () => {
      const name = prompt("Name fur das neue Profil:", "Neues Profil");
      if (!name || !name.trim()) return;
      const profile = createProfileFromProvider("custom");
      profile.name = name.trim();
      settings.profiles.push(profile);
      settings.activeProfileId = profile.id;
      updateProfileSelect();
      populateActiveProfileFields();
      await saveSettings();
    });

    dom.btnDeleteProfile.addEventListener("click", async () => {
      if (settings.profiles.length <= 1) {
        alert("Mindestens ein Profil muss erhalten bleiben.");
        return;
      }

      const profile = getActiveProfile();
      if (!profile) return;
      if (!confirm(`Profil \"${profile.name}\" wirklich loschen?`)) return;

      settings.profiles = settings.profiles.filter((p) => p.id !== profile.id);
      settings.activeProfileId = settings.profiles[0].id;
      updateProfileSelect();
      populateActiveProfileFields();
      await saveSettings();
    });

    dom.profileName.addEventListener("change", () => {
      updateActiveProfile((profile) => {
        profile.name = dom.profileName.value.trim() || "Unbenanntes Profil";
      });
      updateProfileSelect();
    });

    dom.provider.addEventListener("change", () => {
      updateActiveProfile((profile) => {
        const provider = dom.provider.value;
        const preset = PROVIDER_PRESETS[provider] || PROVIDER_PRESETS.custom;
        profile.provider = provider;
        profile.endpoint = preset.endpoint;
        profile.model = preset.model;
        profile.requiresApiKey = preset.requiresApiKey;
        profile.isLocal = preset.isLocal;
        if (!profile.requiresApiKey) profile.apiKey = "";
        if (!profile.name || profile.name === "Unbenanntes Profil") {
          profile.name = preset.label;
        }
      });
      updateProfileSelect();
      populateActiveProfileFields();
    });

    dom.endpoint.addEventListener("change", () => {
      updateActiveProfile((profile) => {
        profile.endpoint = dom.endpoint.value.trim();
      });
    });

    dom.modelName.addEventListener("change", () => {
      updateActiveProfile((profile) => {
        profile.model = dom.modelName.value.trim();
      });
    });

    dom.apiKey.addEventListener("change", () => {
      updateActiveProfile((profile) => {
        profile.apiKey = dom.apiKey.value.trim();
      });
    });

    dom.toggleKeyVis.addEventListener("click", () => {
      const isPassword = dom.apiKey.type === "password";
      dom.apiKey.type = isPassword ? "text" : "password";
    });

    dom.btnTestApi.addEventListener("click", testApi);

    dom.temperature.addEventListener("input", () => {
      settings.temperature = parseFloat(dom.temperature.value);
      dom.temperatureValue.textContent = settings.temperature;
      saveSettings();
    });

    dom.maxTokens.addEventListener("input", () => {
      settings.maxTokens = parseInt(dom.maxTokens.value, 10);
      dom.maxTokensValue.textContent = settings.maxTokens;
      saveSettings();
    });

    dom.systemPrompt.addEventListener("change", () => {
      settings.systemPrompt = dom.systemPrompt.value;
      saveSettings();
    });

    $$("input[name=\"theme\"]").forEach((radio) => {
      radio.addEventListener("change", () => {
        settings.theme = radio.value;
        applyTheme();
        saveSettings();
      });
    });

    dom.fontSize.addEventListener("input", () => {
      settings.fontSize = parseInt(dom.fontSize.value, 10);
      dom.fontSizeValue.textContent = settings.fontSize + "px";
      saveSettings();
    });

    dom.sendWithEnter.addEventListener("change", () => {
      settings.sendWithEnter = dom.sendWithEnter.checked;
      saveSettings();
    });

    dom.showSources.addEventListener("change", () => {
      settings.showSources = dom.showSources.checked;
      saveSettings();
    });

    dom.btnExportAll.addEventListener("click", exportAllChats);
    dom.btnClearAll.addEventListener("click", clearAllChats);
    dom.btnResetSettings.addEventListener("click", resetSettings);

    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", () => {
        if (settings.theme === "system") applyTheme();
      });
  }

  function buildOpenAIRequest(profile, profileSettings, messages) {
    const payload = {
      model: profile.model,
      messages,
      temperature: profileSettings.temperature,
      max_tokens: profileSettings.maxTokens,
      stream: false,
    };

    const headers = {
      "Content-Type": "application/json",
    };
    if (profile.requiresApiKey && profile.apiKey) {
      headers.Authorization = `Bearer ${profile.apiKey}`;
    }

    return {
      endpoint: profile.endpoint,
      headers,
      body: payload,
    };
  }

  function buildAnthropicRequest(profile, profileSettings, messages) {
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
      max_tokens: profileSettings.maxTokens,
      temperature: profileSettings.temperature,
      messages: chatMessages,
    };
    if (systemText) body.system = systemText;

    return {
      endpoint: profile.endpoint,
      headers,
      body,
    };
  }

  async function testApi() {
    const profile = getActiveProfile();
    if (!profile) return;

    if (!profile.endpoint) {
      showTestResult("Bitte zuerst einen API Endpoint eintragen.", "error");
      return;
    }

    if (profile.requiresApiKey && !profile.apiKey) {
      showTestResult("Bitte zuerst einen API Token/Key eintragen.", "error");
      return;
    }

    dom.btnTestApi.disabled = true;
    dom.btnTestApi.innerHTML = '<span class="loading">Teste...</span>';

    const messages = [{ role: "user", content: "Hello" }];
    if (settings.systemPrompt) {
      messages.unshift({ role: "system", content: settings.systemPrompt });
    }

    const request =
      profile.provider === "anthropic"
        ? buildAnthropicRequest(profile, settings, messages)
        : buildOpenAIRequest(profile, settings, messages);

    try {
      const response = await fetch(request.endpoint, {
        method: "POST",
        headers: request.headers,
        body: JSON.stringify(request.body),
      });

      if (response.ok) {
        showTestResult("Verbindung erfolgreich.", "success");
      } else {
        const err = await response.json().catch(() => ({}));
        const msg =
          err.error?.message || err.message || response.statusText || "Unbekannter Fehler";
        showTestResult(`Fehler (${response.status}): ${msg}`, "error");
      }
    } catch (err) {
      showTestResult(`Verbindungsfehler: ${err.message}`, "error");
    } finally {
      dom.btnTestApi.disabled = false;
      dom.btnTestApi.innerHTML =
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> API testen';
    }
  }

  function showTestResult(message, type) {
    dom.apiTestResult.textContent = message;
    dom.apiTestResult.className = `test-result ${type}`;
  }

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
    ) {
      return;
    }

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

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  init();
})();
