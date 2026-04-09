// ============================================
// AI Chat Pro - Main Application Logic
// ============================================

(function () {
  "use strict";

  // ---- State ----
  let state = {
    conversations: [],
    activeConversationId: null,
    settings: null,
    isLoading: false,
  };

  // ---- DOM References ----
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const dom = {
    app: $("#app"),
    sidebar: $("#sidebar"),
    conversationList: $("#conversation-list"),
    chatArea: $("#chat-area"),
    welcomeScreen: $("#welcome-screen"),
    messages: $("#messages"),
    typingIndicator: $("#typing-indicator"),
    messageInput: $("#message-input"),
    btnSend: $("#btn-send"),
    btnNewChat: $("#btn-new-chat"),
    btnToggleSidebar: $("#btn-toggle-sidebar"),
    btnSettings: $("#btn-settings"),
    btnOpenTab: $("#btn-open-tab"),
    btnExport: $("#btn-export"),
    btnClearChat: $("#btn-clear-chat"),
    btnEditTitle: $("#btn-edit-title"),
    chatTitle: $("#chat-title"),
    modelBadge: $("#model-badge"),
    charCount: $("#char-count"),
    inputHintText: $("#input-hint-text"),
    searchChats: $("#search-chats"),
    exportModal: $("#export-modal"),
    deleteModal: $("#delete-modal"),
    toastContainer: $("#toast-container"),
  };

  // ---- Initialize ----
  async function init() {
    await loadState();
    applySettings();
    renderConversationList();
    renderActiveChat();
    bindEvents();
  }

  async function loadState() {
    const data = await chrome.storage.local.get([
      "conversations",
      "activeConversationId",
      "settings",
    ]);
    state.conversations = data.conversations || [];
    state.activeConversationId = data.activeConversationId || null;
    state.settings = data.settings || getDefaultSettings();
  }

  function getDefaultSettings() {
    return {
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
  }

  async function saveState() {
    await chrome.storage.local.set({
      conversations: state.conversations,
      activeConversationId: state.activeConversationId,
    });
  }

  // ---- Settings ----
  function applySettings() {
    const s = state.settings;
    // Theme
    dom.app.className = `theme-${s.theme === "system" ? getSystemTheme() : s.theme}`;
    // Font size
    document.documentElement.style.setProperty(
      "--font-size",
      s.fontSize + "px",
    );
    // Model badge
    dom.modelBadge.textContent = s.model;
    // Input hint
    dom.inputHintText.textContent = s.sendWithEnter
      ? "Enter zum Senden, Shift+Enter fur neue Zeile"
      : "Ctrl+Enter zum Senden, Enter fur neue Zeile";
  }

  function getSystemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  // ---- Events ----
  function bindEvents() {
    // New Chat
    dom.btnNewChat.addEventListener("click", createNewChat);

    // Toggle Sidebar
    dom.btnToggleSidebar.addEventListener("click", () => {
      dom.sidebar.classList.toggle("collapsed");
    });

    // Settings
    dom.btnSettings.addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });

    // Open in Tab
    dom.btnOpenTab.addEventListener("click", () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("popup/popup.html") });
      window.close();
    });

    // Send Message
    dom.btnSend.addEventListener("click", sendMessage);

    // Input handling
    dom.messageInput.addEventListener("input", handleInputChange);
    dom.messageInput.addEventListener("keydown", handleInputKeydown);

    // Suggestion chips
    $$(".suggestion-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        dom.messageInput.value = chip.dataset.prompt;
        handleInputChange();
        sendMessage();
      });
    });

    // Export
    dom.btnExport.addEventListener("click", () =>
      toggleModal(dom.exportModal, true),
    );
    $("#export-md").addEventListener("click", () => exportChat("md"));
    $("#export-json").addEventListener("click", () => exportChat("json"));

    // Clear chat
    dom.btnClearChat.addEventListener("click", () =>
      toggleModal(dom.deleteModal, true),
    );
    $("#confirm-delete").addEventListener("click", deleteActiveChat);

    // Edit title
    dom.btnEditTitle.addEventListener("click", editChatTitle);

    // Search chats
    dom.searchChats.addEventListener("input", renderConversationList);

    // Modal close buttons
    $$(".modal-close").forEach((btn) => {
      btn.addEventListener("click", () => {
        btn.closest(".modal").classList.add("hidden");
      });
    });

    $$(".modal-backdrop").forEach((backdrop) => {
      backdrop.addEventListener("click", () => {
        backdrop.closest(".modal").classList.add("hidden");
      });
    });

    // Listen for settings changes
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.settings) {
        state.settings = changes.settings.newValue;
        applySettings();
      }
    });

    // System theme change
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", () => {
        if (state.settings.theme === "system") applySettings();
      });
  }

  // ---- Input Handling ----
  function handleInputChange() {
    const val = dom.messageInput.value;
    dom.btnSend.disabled = !val.trim();
    // Auto-resize
    dom.messageInput.style.height = "auto";
    dom.messageInput.style.height =
      Math.min(dom.messageInput.scrollHeight, 120) + "px";
    // Char count
    if (val.length > 0) {
      dom.charCount.textContent = val.length;
    } else {
      dom.charCount.textContent = "";
    }
  }

  function handleInputKeydown(e) {
    const s = state.settings;
    if (s.sendWithEnter) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    } else {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        sendMessage();
      }
    }
  }

  // ---- Conversations ----
  function createNewChat() {
    const conv = {
      id: generateId(),
      title: "Neuer Chat",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    state.conversations.unshift(conv);
    state.activeConversationId = conv.id;
    saveState();
    renderConversationList();
    renderActiveChat();
    dom.messageInput.focus();
  }

  function switchToChat(id) {
    state.activeConversationId = id;
    saveState();
    renderConversationList();
    renderActiveChat();
  }

  function getActiveConversation() {
    return state.conversations.find((c) => c.id === state.activeConversationId);
  }

  function deleteActiveChat() {
    toggleModal(dom.deleteModal, false);
    const idx = state.conversations.findIndex(
      (c) => c.id === state.activeConversationId,
    );
    if (idx !== -1) {
      state.conversations.splice(idx, 1);
    }
    state.activeConversationId =
      state.conversations.length > 0 ? state.conversations[0].id : null;
    saveState();
    renderConversationList();
    renderActiveChat();
    showToast("Chat geloscht", "success");
  }

  function editChatTitle() {
    const conv = getActiveConversation();
    if (!conv) return;
    const newTitle = prompt("Chat-Titel:", conv.title);
    if (newTitle && newTitle.trim()) {
      conv.title = newTitle.trim();
      saveState();
      renderConversationList();
      dom.chatTitle.textContent = conv.title;
    }
  }

  // ---- Render ----
  function renderConversationList() {
    const search = dom.searchChats.value.toLowerCase();
    const filtered = state.conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(search) ||
        c.messages.some((m) => m.content.toLowerCase().includes(search)),
    );

    if (filtered.length === 0) {
      dom.conversationList.innerHTML =
        '<div class="conv-empty">Keine Chats vorhanden</div>';
      return;
    }

    dom.conversationList.innerHTML = filtered
      .map(
        (conv) => `
      <div class="conversation-item ${conv.id === state.activeConversationId ? "active" : ""}"
           data-id="${conv.id}">
        <svg class="conv-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span class="conv-title">${escapeHtml(conv.title)}</span>
        <button class="conv-delete" data-id="${conv.id}" title="Loschen">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `,
      )
      .join("");

    // Bind conversation click events
    dom.conversationList
      .querySelectorAll(".conversation-item")
      .forEach((item) => {
        item.addEventListener("click", (e) => {
          if (e.target.closest(".conv-delete")) return;
          switchToChat(item.dataset.id);
        });
      });

    dom.conversationList.querySelectorAll(".conv-delete").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const idx = state.conversations.findIndex((c) => c.id === id);
        if (idx !== -1) {
          state.conversations.splice(idx, 1);
          if (state.activeConversationId === id) {
            state.activeConversationId =
              state.conversations.length > 0 ? state.conversations[0].id : null;
          }
          saveState();
          renderConversationList();
          renderActiveChat();
        }
      });
    });
  }

  function renderActiveChat() {
    const conv = getActiveConversation();

    if (!conv) {
      dom.welcomeScreen.style.display = "flex";
      dom.messages.style.display = "none";
      dom.chatTitle.textContent = "Neuer Chat";
      return;
    }

    dom.welcomeScreen.style.display = "none";
    dom.messages.style.display = "flex";
    dom.chatTitle.textContent = conv.title;

    dom.messages.innerHTML = conv.messages
      .map((msg) => renderMessage(msg))
      .join("");

    // Bind copy buttons
    bindCopyButtons();

    // Scroll to bottom
    scrollToBottom();
  }

  function renderMessage(msg) {
    const isUser = msg.role === "user";
    const avatar = isUser ? "Du" : "AI";
    const time = formatTime(msg.timestamp);
    const body = isUser
      ? escapeHtml(msg.content).replace(/\n/g, "<br>")
      : renderMarkdown(msg.content);

    let sourcesHtml = "";
    if (
      !isUser &&
      msg.citations &&
      msg.citations.length > 0 &&
      state.settings.showSources
    ) {
      sourcesHtml = `
        <div class="message-sources">
          <div class="sources-title">Quellen</div>
          <div>${msg.citations
            .map((url, i) => {
              const domain = extractDomain(url);
              return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="source-link">${i + 1}. ${domain}</a>`;
            })
            .join("")}</div>
        </div>
      `;
    }

    return `
      <div class="message ${isUser ? "user" : "assistant"}">
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
          <div class="message-header">
            <span class="message-author">${isUser ? "Du" : "AI Chat Pro"}</span>
            <span class="message-time">${time}</span>
          </div>
          <div class="message-body">${body}</div>
          ${sourcesHtml}
        </div>
      </div>
    `;
  }

  // ---- Send Message ----
  async function sendMessage() {
    const text = dom.messageInput.value.trim();
    if (!text || state.isLoading) return;

    // Check API Key
    if (!state.settings.apiKey) {
      showToast("Bitte API Key in den Einstellungen hinterlegen", "error");
      return;
    }

    // Create conversation if needed
    if (!getActiveConversation()) {
      createNewChat();
    }

    const conv = getActiveConversation();

    // Add user message
    const userMsg = {
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    conv.messages.push(userMsg);

    // Auto-title: use first message
    if (conv.messages.length === 1) {
      conv.title = text.length > 40 ? text.substring(0, 40) + "..." : text;
      dom.chatTitle.textContent = conv.title;
      renderConversationList();
    }

    // Clear input
    dom.messageInput.value = "";
    handleInputChange();

    // Show user message
    dom.welcomeScreen.style.display = "none";
    dom.messages.style.display = "flex";
    dom.messages.insertAdjacentHTML("beforeend", renderMessage(userMsg));
    scrollToBottom();

    // Show typing indicator
    state.isLoading = true;
    dom.typingIndicator.classList.remove("hidden");
    dom.btnSend.disabled = true;
    scrollToBottom();

    // Build message history for API
    const apiMessages = conv.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: "chat", messages: apiMessages },
          (resp) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else if (resp.error) {
              reject(new Error(resp.error));
            } else {
              resolve(resp);
            }
          },
        );
      });

      // Add assistant message
      const assistantMsg = {
        role: "assistant",
        content: response.content,
        citations: response.citations || [],
        usage: response.usage,
        timestamp: Date.now(),
      };
      conv.messages.push(assistantMsg);
      conv.updatedAt = Date.now();
      saveState();

      // Render assistant message
      dom.messages.insertAdjacentHTML("beforeend", renderMessage(assistantMsg));
      bindCopyButtons();
    } catch (err) {
      showToast(err.message, "error");
      // Remove user message on error if it was the only message
      if (conv.messages.length === 1) {
        conv.messages.pop();
        state.conversations.shift();
        state.activeConversationId = null;
        saveState();
        renderConversationList();
        renderActiveChat();
      }
    } finally {
      state.isLoading = false;
      dom.typingIndicator.classList.add("hidden");
      dom.btnSend.disabled = !dom.messageInput.value.trim();
      scrollToBottom();
    }
  }

  // ---- Markdown Renderer ----
  function renderMarkdown(text) {
    if (!text) return "";

    // Process code blocks first
    let html = text;
    const codeBlocks = [];

    // Fenced code blocks
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      const id = `__CODE_${codeBlocks.length}__`;
      const highlighted = highlightSyntax(code.trim(), lang);
      codeBlocks.push(`<div class="code-block">
        <div class="code-header">
          <span class="code-lang">${lang || "code"}</span>
          <button class="btn-copy-code" data-code="${encodeURIComponent(code.trim())}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Kopieren
          </button>
        </div>
        <pre><code>${highlighted}</code></pre>
      </div>`);
      return id;
    });

    // Inline code (protect from other processing)
    const inlineCodes = [];
    html = html.replace(/`([^`]+)`/g, (_, code) => {
      const id = `__INLINE_${inlineCodes.length}__`;
      inlineCodes.push(`<code>${escapeHtml(code)}</code>`);
      return id;
    });

    // Headers
    html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
    html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
    html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
    html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

    // Bold & Italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

    // Strikethrough
    html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");

    // Horizontal Rule
    html = html.replace(/^---$/gm, "<hr>");

    // Blockquotes
    html = html.replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>");

    // Links
    html = html.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>',
    );

    // Unordered lists
    html = html.replace(/^[\s]*[-*] (.+)$/gm, "<li>$1</li>");
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>");

    // Ordered lists
    html = html.replace(/^[\s]*\d+\. (.+)$/gm, "<li>$1</li>");

    // Paragraphs - wrap remaining text in <p> tags
    html = html
      .split("\n\n")
      .map((block) => {
        block = block.trim();
        if (!block) return "";
        if (
          block.startsWith("<h") ||
          block.startsWith("<ul") ||
          block.startsWith("<ol") ||
          block.startsWith("<blockquote") ||
          block.startsWith("<hr") ||
          block.startsWith("__CODE_") ||
          block.startsWith("<div") ||
          block.startsWith("<li")
        ) {
          return block;
        }
        return `<p>${block.replace(/\n/g, "<br>")}</p>`;
      })
      .join("\n");

    // Restore inline code
    inlineCodes.forEach((code, i) => {
      html = html.replace(`__INLINE_${i}__`, code);
    });

    // Restore code blocks
    codeBlocks.forEach((block, i) => {
      html = html.replace(`__CODE_${i}__`, block);
    });

    return html;
  }

  // ---- Syntax Highlighting ----
  function highlightSyntax(code, lang) {
    const escaped = escapeHtml(code);

    if (!lang) return escaped;

    let result = escaped;

    // Comments
    result = result.replace(
      /(\/\/.*$)/gm,
      '<span class="token-comment">$1</span>',
    );
    result = result.replace(
      /(#.*$)/gm,
      '<span class="token-comment">$1</span>',
    );
    result = result.replace(
      /(\/\*[\s\S]*?\*\/)/g,
      '<span class="token-comment">$1</span>',
    );

    // Strings
    result = result.replace(
      /(&quot;(?:[^&]|&(?!quot;))*?&quot;)/g,
      '<span class="token-string">$1</span>',
    );
    result = result.replace(
      /(&#39;(?:[^&]|&(?!#39;))*?&#39;)/g,
      '<span class="token-string">$1</span>',
    );
    result = result.replace(
      /(`[^`]*`)/g,
      '<span class="token-string">$1</span>',
    );

    // Numbers
    result = result.replace(
      /\b(\d+\.?\d*)\b/g,
      '<span class="token-number">$1</span>',
    );

    // Keywords (common across languages)
    const keywords = [
      "function",
      "const",
      "let",
      "var",
      "if",
      "else",
      "for",
      "while",
      "do",
      "return",
      "class",
      "import",
      "export",
      "from",
      "default",
      "new",
      "this",
      "try",
      "catch",
      "throw",
      "async",
      "await",
      "switch",
      "case",
      "break",
      "continue",
      "typeof",
      "instanceof",
      "in",
      "of",
      "yield",
      "extends",
      "def",
      "print",
      "elif",
      "except",
      "finally",
      "with",
      "as",
      "lambda",
      "pass",
      "raise",
      "True",
      "False",
      "None",
      "self",
      "and",
      "or",
      "not",
      "fn",
      "pub",
      "mod",
      "use",
      "impl",
      "trait",
      "struct",
      "enum",
      "match",
      "mut",
      "ref",
      "static",
      "void",
      "int",
      "float",
      "double",
      "char",
      "bool",
      "string",
      "type",
      "interface",
      "abstract",
      "final",
      "override",
      "public",
      "private",
      "protected",
      "package",
      "null",
      "undefined",
      "true",
      "false",
    ];

    const keywordRegex = new RegExp("\\b(" + keywords.join("|") + ")\\b", "g");
    result = result.replace(keywordRegex, (match) => {
      // Don't highlight inside already-highlighted spans
      return `<span class="token-keyword">${match}</span>`;
    });

    // Function calls
    result = result.replace(
      /\b([a-zA-Z_]\w*)\s*\(/g,
      '<span class="token-function">$1</span>(',
    );

    return result;
  }

  // ---- Copy Code ----
  function bindCopyButtons() {
    dom.messages.querySelectorAll(".btn-copy-code").forEach((btn) => {
      btn.replaceWith(btn.cloneNode(true)); // Remove old listeners
    });
    dom.messages.querySelectorAll(".btn-copy-code").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const code = decodeURIComponent(btn.dataset.code);
        try {
          await navigator.clipboard.writeText(code);
          btn.classList.add("copied");
          btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Kopiert!`;
          setTimeout(() => {
            btn.classList.remove("copied");
            btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Kopieren`;
          }, 2000);
        } catch {
          showToast("Kopieren fehlgeschlagen", "error");
        }
      });
    });
  }

  // ---- Export ----
  function exportChat(format) {
    const conv = getActiveConversation();
    if (!conv || conv.messages.length === 0) {
      showToast("Kein Chat zum Exportieren", "error");
      toggleModal(dom.exportModal, false);
      return;
    }

    let content, filename, mimeType;

    if (format === "md") {
      content = `# ${conv.title}\n\n`;
      content += conv.messages
        .map((m) => {
          const author = m.role === "user" ? "**Du**" : "**AI Chat Pro**";
          return `### ${author}\n\n${m.content}\n`;
        })
        .join("\n---\n\n");
      filename = `chat-${conv.id}.md`;
      mimeType = "text/markdown";
    } else {
      content = JSON.stringify(
        {
          title: conv.title,
          exportedAt: new Date().toISOString(),
          messages: conv.messages,
        },
        null,
        2,
      );
      filename = `chat-${conv.id}.json`;
      mimeType = "application/json";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    toggleModal(dom.exportModal, false);
    showToast("Chat exportiert!", "success");
  }

  // ---- Helpers ----
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function formatTime(timestamp) {
    const d = new Date(timestamp);
    const now = new Date();
    const diff = now - d;

    if (diff < 60000) return "gerade eben";
    if (diff < 3600000) return Math.floor(diff / 60000) + " Min.";
    if (diff < 86400000)
      return d.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      });
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  }

  function extractDomain(url) {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return url;
    }
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      dom.chatArea.scrollTop = dom.chatArea.scrollHeight;
    });
  }

  function toggleModal(modal, show) {
    modal.classList.toggle("hidden", !show);
  }

  function showToast(message, type = "success") {
    const icon =
      type === "success"
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `${icon}<span>${escapeHtml(message)}</span>`;
    dom.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(8px)";
      toast.style.transition = "0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ---- Start ----
  init();
})();
