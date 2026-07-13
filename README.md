# Jarvis 2.0

Jarvis 2.0 is a browser-based conversational AI demo by Digital Dream. It includes an editorial product page and a chat interface powered by Groq's OpenAI-compatible Chat Completions API.

## Features

- Responsive product landing page
- Conversational chat powered by Llama 3.3 70B
- Streaming replies that appear as Jarvis generates them
- Emotionally aware, practical support with responsible health-safety guidance
- New-chat and text-file chat export controls
- Optional text, Markdown, CSV, and JSON file context (first 24,000 characters)
- Automatic message-area resizing
- Voice conversations that prefer a natural English male browser voice, where Web Speech APIs are supported
- A required per-session voice preference modal for Male or Female Jarvis voices
- Standalone login and sign-up design previews with automatic Jarvis welcome messages
- Loading screen and unsaved-chat warning
- No account or browser storage; refreshing clears the conversation

## Project structure

| File | Purpose |
| --- | --- |
| `index.html` | Jarvis product and introduction page |
| `chat.html` | Chat interface markup |
| `login.html` | Standalone login-page design preview |
| `signup.html` | Standalone sign-up-page design preview |
| `style.css` | Shared styling for all pages |
| `script.js` | Chat, attachments, exports, voice, and UI behavior |
| `auth.js` | Login/sign-up preview behavior and welcome voice |
| `config.js` | Groq API configuration |
| `preloader.js` | Loading-screen behavior |
| `favicon.svg` | Site favicon |

## Run locally

This is a static site, so no package installation or build step is required. Serve the folder with any local web server, then open the supplied local address in a browser. For example, with VS Code's Live Server extension, use **Open with Live Server** on `index.html`.

Opening `index.html` directly may work, but a local server is recommended because the app makes API requests and uses browser features such as file handling and speech recognition.

## Validate JavaScript

Node.js LTS is installed for local syntax checks. Run:

```powershell
node --check auth.js
git diff --check
```

## Configure Groq

1. Create or retrieve a Groq API key from [GroqCloud](https://console.groq.com/keys).
2. In `config.js`, set `API_KEY` to that key.
3. Jarvis is configured to use Groq's Llama 3.3 70B model.

```js
const API_KEY = 'YOUR_API_KEY_HERE';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
```

## Security note

`config.js` is loaded in the browser, so any key placed there is visible to visitors. Use this approach only for private, local demos with a restricted, disposable key. For a deployed public site, move the Groq request and key to a secure server-side endpoint, and do not commit real credentials to version control.

## Account-page previews

`login.html` and `signup.html` are standalone visual previews and are not linked from the landing or chat pages. Their form and social sign-in controls do not authenticate users yet.

- **Login:** Email or username, password, forgot-password link, and Google, Apple ID, and Facebook options.
- **Sign-up:** Full name, email, password, confirm password, and Google, Apple ID, and Facebook options.
- **Welcome voice:** Login says, "Welcome back, I'm Jarvis 2.0. Ready to continue your journey." Sign-up says, "Welcome to Jarvis 2.0. I'm here to assist you. Let's get started."

Each page requests its welcome voice automatically after the loading screen. The shared voice helper prefers natural or neural English voices where available and uses a livelier speaking rate and pitch. If a browser blocks automatic audio, the visible **Hear Jarvis's welcome** control can replay it.

## Browser support

The core chat experience works in modern browsers with JavaScript enabled. Before each chat, the visitor chooses a Male or Female voice preference; the choice lasts only for that page session. Voice chat requires browser support for `SpeechRecognition` / `webkitSpeechRecognition` and speech synthesis, plus microphone permission; it is hidden when speech recognition is unavailable. Jarvis requests microphone access when a voice session starts, pauses listening while it prepares and speaks a reply, and fully stops listening when **Stop** is pressed. Jarvis prioritizes natural English voices for the selected preference, removes common chat formatting before speaking, and uses a conversational pace; the final voice quality depends on the voices installed on the device.

## Responsible use

Jarvis responds with emotional awareness and practical guidance, but it is not a doctor, therapist, or emergency service. Its responses can be incomplete or incorrect. Verify important information, especially for medical, legal, financial, safety, or emergency decisions. For immediate danger or a medical or mental-health emergency, contact local emergency services or an urgent crisis service.
