# AI Chat Pro Client

A modern browser extension that brings multiple AI providers together under a single, unified chat interface.

[![Latest release](https://img.shields.io/github/v/release/dan17612/AI_Chat_Pro_Browser_Extension?label=release&color=blue)](https://github.com/dan17612/AI_Chat_Pro_Browser_Extension/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/dan17612/AI_Chat_Pro_Browser_Extension/total?color=brightgreen)](https://github.com/dan17612/AI_Chat_Pro_Browser_Extension/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-orange)](manifest.json)

> ### ⬇️ [**Download the latest release**](https://github.com/dan17612/AI_Chat_Pro_Browser_Extension/releases/latest)
>
> Grab the prebuilt ZIP from the Releases page, extract it, and load it as an unpacked extension. See [Installation](#installation-chrome--edge) below for the full steps.

## Preview

![Extension preview](./Aufzeichnung%202026-04-09%20195453.gif)

## What's New in v1.0.0

This release marks the first stable version of **AI Chat Pro Client** and introduces a complete internationalization layer, persistent model verification, and full data backup support.

- **Multilingual interface (EN / DE / RU)** — The entire UI of both the popup and the options page is now translatable. The active language follows the browser locale by default and can be switched manually under *Appearance → Language*. A reusable i18n module (`shared/i18n.js`) powers the translation pipeline through `data-i18n` attributes.
- **Localized backend errors** — Errors raised by the background service worker (missing API key, connection failures, provider responses, LM Studio errors) are returned as structured error codes and translated in the popup, so users always see error messages in their selected language.
- **Persistent model verification** — Results from *Check models* are now cached per provider and per model in extension storage. Each provider view displays a *Last check: …* timestamp so you can see at a glance which models are reachable without re-running the test.
- **Full backup export & import** — *Export backup* now produces a single JSON file (`type: "ai-chat-pro-client-backup"`, version `2.0`) containing all conversations, the active conversation, and all settings (providers, models, custom models, base URLs, appearance, behavior). The corresponding *Import backup* action restores everything in one step and remains backwards-compatible with the legacy conversation-only export format.
- **Custom model management** — Models added manually through the options page are stored per provider, can be removed individually, and their cached check results are cleaned up automatically.
- **Rebrand to *AI Chat Pro Client*** — Application name, manifest, popup title, and all user-facing strings have been unified.

## Features

- **Multiple providers** — Perplexity, OpenAI, Anthropic, Google Gemini, and LM Studio (local).
- **Unified chat UI** — Conversation list, search, rename, delete, and Markdown rendering with code-block copy buttons.
- **Local-first storage** — Conversations, settings, API keys, and custom models are stored locally via `chrome.storage.local` and never leave the browser.
- **Per-provider configuration** — API key, base URL, model selection, temperature, max tokens, and system prompt are configured independently for each provider.
- **Connection & model testing** — One-click *Test API* and *Check models* actions per provider, with cached results.
- **Custom models** — Add provider-specific model IDs by hand when the official model list lags behind.
- **LM Studio support** — Talk to local OpenAI-compatible servers; auto-discovery of loaded models, optional bearer token.
- **Backup & restore** — Export and import the full extension state as a single JSON file.
- **Appearance & behavior** — Dark / light theme, font size, send-with-Enter toggle, source link toggle, and language selector.
- **Chat export** — Export an individual conversation as Markdown or JSON.

## Project Structure

- [`manifest.json`](manifest.json) — Extension manifest (MV3)
- [`popup/popup.html`](popup/popup.html) — Chat UI markup
- [`popup/popup.js`](popup/popup.js) — Chat logic, rendering, state management
- [`options/options.html`](options/options.html) — Settings page markup
- [`options/options.js`](options/options.js) — Provider configuration, model checks, backup I/O
- [`background/background.js`](background/background.js) — Provider API routing in the service worker
- [`shared/i18n.js`](shared/i18n.js) — Translation dictionary and helpers (EN / DE / RU)
- [`shared/announcement.js`](shared/announcement.js) — Remote announcement banner: fetch, cache, version filter, render

## Installation (Chrome / Edge)

### Option 1 — Install the latest release (recommended)

1. Open the [**Releases page**](https://github.com/dan17612/AI_Chat_Pro_Browser_Extension/releases/latest) and download the `ai-chat-pro-client-<version>.zip` asset.
2. Extract the archive to a folder of your choice.
3. Open the extensions page in your browser:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
4. Enable **Developer mode** (top right).
5. Click **Load unpacked** and select the extracted folder.

### Option 2 — Install from source (for development)

1. Clone the repository: `git clone https://github.com/dan17612/AI_Chat_Pro_Browser_Extension.git`
2. Open `chrome://extensions` (or `edge://extensions`) and enable **Developer mode**.
3. Click **Load unpacked** and select the cloned project root directory.

## Usage

1. Open the extension from the toolbar.
2. Click the settings icon and choose your preferred provider.
3. Enter the API key (optional for LM Studio).
4. Optionally adjust the model, base URL, temperature, and system prompt.
5. Return to the popup and start chatting.

## Provider Notes

- **LM Studio**
  - Default server URL: `http://localhost:1234`
  - An API key can be set if your local server enforces authentication.
  - Make sure LM Studio is running and a model is loaded before sending a message.
- **OpenAI / Anthropic / Gemini / Perplexity**
  - Each provider has its own API key field. Keys are stored locally and never shared.
  - The *Base URL (advanced)* field lets you point to OpenAI-compatible proxies or self-hosted gateways.

## Remote Announcements

The extension fetches an optional announcement banner from `https://schiller.pw/AIChatProClientMessage/main.json` once per hour and displays it above the chat area. This is used for release notifications, security advisories, or general news. The fetch is cached locally and never sends any data about the user.

The endpoint serves a JSON file with the following shape:

```json
{
  "id": "2026-04-10-v1.1.0",
  "type": "update",
  "title":     { "en": "Update available", "de": "Update verfügbar", "ru": "Доступно обновление" },
  "body":      { "en": "Version 1.1.0 …", "de": "Version 1.1.0 …", "ru": "Доступна версия 1.1.0 …" },
  "linkLabel": { "en": "Download", "de": "Herunterladen", "ru": "Скачать" },
  "link": "https://github.com/dan17612/AI_Chat_Pro_Browser_Extension/releases/latest",
  "targetVersion": "1.1.0",
  "minVersion": null,
  "dismissable": true,
  "expiresAt": null
}
```

| Field                                | Description                                                                                                                                                                                                                        |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                               | Unique identifier. Bump this value to re-show the banner to users who previously dismissed it.                                                                                                                                     |
| `type`                             | One of `info`, `update`, `warning`. Controls the banner color.                                                                                                                                                               |
| `title` / `body` / `linkLabel` | Either a plain string or an object keyed by language code (`en`, `de`, `ru`). Falls back to `en` if the active language has no entry.                                                                                      |
| `link`                             | Optional URL. When present, a button is rendered.                                                                                                                                                                                  |
| `targetVersion`                    | The banner is shown only if the installed extension version is**older** than this value. Users on the latest version will not see it; once a new release with a higher `targetVersion` is published, the banner reappears. |
| `minVersion`                       | Optional lower bound. The banner is hidden for installs below this version.                                                                                                                                                        |
| `dismissable`                      | If `false`, the banner cannot be closed until the `id` changes or it expires.                                                                                                                                                  |
| `expiresAt`                        | Optional ISO-8601 timestamp. The banner disappears automatically afterwards.                                                                                                                                                       |

A ready-to-host example lives in [`examples/announcement-main.json`](examples/announcement-main.json).

## Development

- No build pipeline — this is a plain browser extension project.
- After editing files, reload the extension on the browser's extensions page.
- The i18n dictionary lives in `shared/i18n.js`. To add a new language, add a new key under `TRANSLATIONS` and extend the language selector in `options/options.html`.

## License

MIT
