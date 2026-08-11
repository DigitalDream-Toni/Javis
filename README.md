# Jarvis 2.0

Jarvis 2.0 is a browser-based conversational AI demo by Digital Dream. It includes an editorial product page and a chat interface powered by Groq's OpenAI-compatible Chat Completions API. It is a static front-end project: chat state exists only for the current page session.

## Features

- Responsive product landing page
- Text chat powered by Groq's Llama 3.3 70B model, with Qwen 3.6 27B used automatically for image turns
- Streaming replies that appear as Jarvis generates them
- Context-aware replies that account for implied meaning, corrections, idioms, and conversational intent
- Emotionally aware, practical support with calibrated empathy and responsible health-safety guidance
- Long-chat continuity notes that retain key details, decisions, preferences, and unresolved questions while keeping recent turns in focus
- Multilingual, idiomatic responses that follow the user's language and clarify unfamiliar slang instead of guessing
- Transparent handling of uncertainty for current, emerging, and niche information; no fabricated live-source claims
- Improved multi-topic dialogue handling, creative-writing direction, and recoverable network/API failures
- New-chat and text-file chat export controls
- Attach images, TXT, Markdown, CSV, JSON, PDF, or DOCX files with a removable preview/status row above the composer
- Image and typed text are sent together as one multimodal message; readable document text is extracted in the browser and sent with the typed message (up to the first 24,000 characters)
- Automatic message-area resizing
- Voice conversations that prefer a natural English male browser voice, where Web Speech APIs are supported
- A required per-session voice preference modal for Male or Female Jarvis voices
- Immersive voice mode with an animated Jarvis presence, live listening/thinking/speaking states, an audio visualizer, and conversation-responsive scene moods
- Standalone login and sign-up design previews with automatic Jarvis welcome messages
- A 2.5-second loading screen and unsaved-chat warning
- No account or browser storage; refreshing clears the conversation

## Project structure

| File | Purpose |
| --- | --- |
| `index.html` | Jarvis product and introduction page |
| `chat.html` | Chat interface markup |
| `login.html` | Standalone login-page design preview |
| `signup.html` | Standalone sign-up-page design preview |
| `style.css` | Shared styling for all pages |
| `script.js` | Chat, attachment handling, exports, voice, immersive voice-scene behavior, and UI logic |
| `auth.js` | Login/sign-up preview behavior and welcome voice |
| `config.js` | Text and vision Groq model configuration plus the local-demo API key |
| `preloader.js` | Loading-screen behavior |
| `favicon.svg` | Site favicon |

## Run locally

This is a static site, so no package installation or build step is required. Serve the folder with any local web server, then open the supplied local address in a browser. For example, with VS Code's Live Server extension, use **Open with Live Server** on `index.html`.

Opening `index.html` directly may work, but a local server is recommended because the app makes API requests and uses browser features such as file handling and speech recognition.

## Validate JavaScript

Node.js LTS is installed for local syntax checks. Run:

```powershell
node --check auth.js
node --check script.js
node --check config.js
node --check preloader.js
git diff --check
```

## Configure Groq

1. Create or retrieve a Groq API key from [GroqCloud](https://console.groq.com/keys).
2. In `config.js`, set `API_KEY` to that key.
3. Jarvis uses Llama 3.3 70B for text-only chat and Qwen 3.6 27B when the user attaches an image.

```js
const API_KEY = 'YOUR_API_KEY_HERE';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_VISION_MODEL = 'qwen/qwen3.6-27b';
```

## Attachments

The attachment picker accepts images plus `.txt`, `.md`, `.csv`, `.json`, `.pdf`, and `.docx` files. Images are sent to the configured vision model with the user's message. Text-based files are read in the browser; PDF text is extracted with PDF.js and DOCX body text with JSZip, both loaded from CDN when needed. Scanned PDFs, protected PDFs, legacy `.doc` files, spreadsheets other than CSV, audio, video, and other binary formats are not supported.

The app does not impose a file-size limit, but Groq and the selected model enforce their own request limits. Large documents may also be truncated to the first 24,000 extracted characters.

## Security note

`config.js` is loaded in the browser, so any key placed there is visible to visitors. Use this approach only for private, local demos with a restricted, disposable key. For a deployed public site, move the Groq request and key to a secure server-side endpoint, and do not commit real credentials to version control. If a key is ever committed or shared, revoke and rotate it immediately.

## Account-page previews

`login.html` and `signup.html` are standalone visual previews and are not linked from the landing or chat pages. Their form and social sign-in controls do not authenticate users yet.

- **Login:** Email or username, password, forgot-password link, and Google, Apple ID, and Facebook options.
- **Sign-up:** Full name, email, password, confirm password, and Google, Apple ID, and Facebook options.
- **Welcome voice:** Login says, "Welcome back, I'm Jarvis 2.0. Ready to continue your journey." Sign-up says, "Welcome to Jarvis 2.0. I'm here to assist you. Let's get started."

Each page requests its welcome voice automatically after the loading screen. The shared voice helper prefers natural or neural English voices where available and uses a livelier speaking rate and pitch. If a browser blocks automatic audio, the visible **Hear Jarvis's welcome** control can replay it.

## Browser support

The core chat experience works in modern browsers with JavaScript enabled. Before each chat, the visitor chooses a Male or Female voice preference; the choice lasts only for that page session. Voice chat requires browser support for `SpeechRecognition` / `webkitSpeechRecognition` and speech synthesis, plus microphone permission; it is hidden when speech recognition is unavailable. Starting voice chat opens the immersive voice scene, which visibly changes between listening, thinking, and speaking, and uses warm or creative scene palettes for relevant conversation topics. Jarvis requests microphone access when a voice session starts, pauses listening while it prepares and speaks a reply, and fully stops listening when **Stop** is pressed. Jarvis prioritizes natural English voices for the selected preference, removes common chat formatting before speaking, and uses a conversational pace; the final voice quality depends on the voices installed on the device.

## Responsible use

Jarvis responds with emotional awareness and practical guidance, but it is not a doctor, therapist, or emergency service. Its responses can be incomplete or incorrect. Verify important information, especially for medical, legal, financial, safety, or emergency decisions. For immediate danger or a medical or mental-health emergency, contact local emergency services or an urgent crisis service.
