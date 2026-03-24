# Marionette-YZU Command Reference

Because this extension uses an on-device, lightweight AI model (Gemini Nano) to protect your privacy and run locally, it operates more like a voice-activated command line than a fuzzy cloud AI.

For the highest reliability, **always include specific targets** (URLs, index numbers, exactly what to type) in your spoken commands.

## 🗂️ Navigation & Tabs

| What to say                 | What it does                        | Tool Executed |
| --------------------------- | ----------------------------------- | ------------- |
| `"Open youtube.com"`        | Opens URL in a new tab              | `openTab`     |
| `"Show me my open tabs"`    | Lists all open tabs                 | `getTabs`     |
| `"Switch to the Gmail tab"` | Switches to a tab by index or title | `switchTab`   |

## 👁️ Seeing the Page

| What to say                                          | What it does                         | Tool Executed              |
| ---------------------------------------------------- | ------------------------------------ | -------------------------- |
| `"Take a screenshot"`                                | Captures/describes the visible page  | `captureScreenshot`        |
| `"What's the title of this page?"`                   | Reads the page title                 | `getPageTitle`             |
| `"Find the search bar"` / `"Find the submit button"` | Searches for interactive UI elements | `findElements`             |
| `"What can I interact with on this page?"`           | Scans all interactive elements       | `getAccessibilitySnapshot` |

_Note: Use `findElements` if you know what you are looking for. Use `getAccessibilitySnapshot` if you want it to list everything._

## 🖱️ Interacting with Elements

| What to say                        | What it does                            | Tool Executed  |
| ---------------------------------- | --------------------------------------- | -------------- |
| `"Click number 7"`                 | Clicks an element by its index          | `clickElement` |
| `"Type 'hello' into number 3"`     | Types text into an input field by index | `fillInput`    |
| `"Press Enter"` / `"Press Escape"` | Simulates a keyboard key press          | `pressKey`     |

_Note: Always use the index number (e.g., `[7]`) returned by `findElements` when clicking or typing!_

## 📜 Scrolling

| What to say     | What it does          | Tool Executed |
| --------------- | --------------------- | ------------- |
| `"Scroll down"` | Scrolls the page down | `scrollDown`  |
| `"Scroll up"`   | Scrolls the page up   | `scrollUp`    |

## 📄 Reading & Highlighting

| What to say                             | What it does                           | Tool Executed       |
| --------------------------------------- | -------------------------------------- | ------------------- |
| `"Summarize this page"`                 | Grabs all page text, summarizes via AI | `summarizePage`     |
| `"Find the word 'Taiwan'"`              | Highlights matching text on the page   | `highlightText`     |
| `"Highlight elements matching .header"` | Highlights elements by CSS selector    | `highlightSelector` |

_Note: The model does NOT automatically read page text when you ask a question. You must explicitly ask it to summarize or find specific text._

## 🎤 Audio & Translation

| What to say                   | What it does                         | Tool Executed    |
| ----------------------------- | ------------------------------------ | ---------------- |
| `"Listen for 5 seconds"`      | Records tab audio and transcribes it | `listen`         |
| `"Translate this to Spanish"` | Translates selected text             | `translateText`  |
| `"What language is this?"`    | Identifies language of selected text | `detectLanguage` |

## 🧠 Memory & Vault

| What to say                         | What it does                        | Tool Executed              |
| ----------------------------------- | ----------------------------------- | -------------------------- |
| `"Remember my name is John"`        | Saves a fact for future sessions    | `storeMemory`              |
| `"Save this page to my vault"`      | Captures the page for later search  | `captureCurrentPage`       |
| `"Search my vault for AI articles"` | Semantic search through saved pages | `searchVault`              |
| `"How many pages are in my vault?"` | Shows vault stats                   | `getVaultStats`            |
| `"Fill out this form"`              | Loads the form-filling workflow     | `getPlaybook("fill-form")` |

## 📝 Writing

| What to say                                 | What it does                                  | Tool Executed  |
| ------------------------------------------- | --------------------------------------------- | -------------- |
| `"Write 'Hello World' into this text area"` | Writes text directly into an editable element | `writeContent` |

---

### The Golden Rules for Reliability

1. **Always provide the required parameter.**
   - ❌ `"Help me open a new tab"` (Fails: missing URL)
   - ✅ `"Open wikipedia.org in a new tab"`
2. **Treat tools as a 2-step process.**
   - Step 1: `"Find the search bar"` (Wait for it to reply `[7] COMBOBOX: Search`)
   - Step 2: `"Type 'cats' into number 7"`
3. **Use explicit tool mapping words.**
   - Use `"Summarize"` for page content.
   - Use `"Find the word X"` for text.
   - Use `"Find the button X"` for UI elements.
