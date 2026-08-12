/*
  Paste your Groq API key between the quotes.
  Get or manage a key at: https://console.groq.com/keys
*/
const API_KEY = 'YOUR_GROQ_API_KEY_HERE';

// Jarvis uses Llama 3.3 70B for text-only chats.
const GROQ_MODEL = "llama-3.3-70b-versatile";

// Used automatically for image + text messages. This Groq model accepts vision inputs.
const GROQ_VISION_MODEL = "qwen/qwen3.6-27b";
