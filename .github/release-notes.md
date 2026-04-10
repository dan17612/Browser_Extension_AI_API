## Highlights

This release marks the first stable version of **AI Chat Pro Client** and introduces a complete internationalization layer, persistent model verification, and full data backup support.

- **Multilingual interface (EN / DE / RU)** — The entire UI of both the popup and the options page is now translatable. The active language follows the browser locale by default and can be switched manually under *Appearance → Language*. A reusable i18n module (`shared/i18n.js`) powers the translation pipeline through `data-i18n` attributes.
- **Localized backend errors** — Errors raised by the background service worker (missing API key, connection failures, provider responses, LM Studio errors) are returned as structured error codes and translated in the popup, so users always see error messages in their selected language.
- **Persistent model verification** — Results from *Check models* are now cached per provider and per model in extension storage. Each provider view displays a *Last check: …* timestamp so you can see at a glance which models are reachable without re-running the test.
- **Full backup export & import** — *Export backup* now produces a single JSON file (`type: "ai-chat-pro-client-backup"`, version `2.0`) containing all conversations, the active conversation, and all settings. The corresponding *Import backup* action restores everything in one step and remains backwards-compatible with the legacy conversation-only export format.
- **Custom model management** — Models added manually through the options page are stored per provider, can be removed individually, and their cached check results are cleaned up automatically.
- **Markdown tables in chat** — The chat renderer now supports GitHub-flavored markdown tables, including column alignment.
- **Rebrand to *AI Chat Pro Client*** — Application name, manifest, popup title, and all user-facing strings have been unified.

## Installation

1. Download `ai-chat-pro-client-1.0.0.zip` from the assets below.
2. Extract the archive.
3. Open `chrome://extensions` (or `edge://extensions`) and enable **Developer mode**.
4. Click **Load unpacked** and select the extracted folder.

---
