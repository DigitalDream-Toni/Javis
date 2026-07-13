/* Jarvis 2.0 chat logic. No localStorage is used: refreshing clears the chat. */
const messagesElement = document.querySelector('#messages');
const chatMain = document.querySelector('.chat-main');
const form = document.querySelector('#chat-form');
const input = document.querySelector('#message-input');
const sendButton = document.querySelector('#send-button');
const documentInput = document.querySelector('#document-input');
const documentStatus = document.querySelector('#document-status');
const documentName = document.querySelector('#document-name');
const voiceButton = document.querySelector('#voice-button');
const voicePreferenceModal = document.querySelector('#voice-preference-modal');
const voicePreferenceButtons = document.querySelectorAll('[data-voice-preference]');
let conversation = [];
let waitingForReply = false;
let documentContext = '';
let voiceChatActive = false;
let recognitionRunning = false;
let jarvisIsSpeaking = false;
let resumeVoiceListening = () => {};
let voicePlaybackId = 0;
let savedMessageCount = 0;
let pendingLeaveUrl = '';
let userName = '';
let jarvisVoice = null;
let microphonePermissionGranted = false;
let microphonePermissionRequest = null;
let userVoicePreference = '';

const intro = 'Hello, I’m Jarvis. What should I call you? And how is your day going so far?';

function scrollToLatest() {
  // Keep a streamed reply in view without making the user scroll manually.
  // This runs only when a message is added or receives a new streamed chunk.
  requestAnimationFrame(() => {
    chatMain.scrollTop = chatMain.scrollHeight;
  });
}

function createAvatar() {
  const avatar = document.createElement('div');
  avatar.className = 'jarvis-avatar';
  avatar.textContent = 'J';
  return avatar;
}

function addMessage(role, text, isError = false) {
  const row = document.createElement('article');
  row.className = `message-row ${role}${isError ? ' error-message' : ''}`;
  if (role === 'jarvis') row.append(createAvatar());
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.textContent = text;
  row.append(bubble);
  messagesElement.append(row);
  scrollToLatest();
  return bubble;
}

function showTyping() {
  const row = document.createElement('article');
  row.className = 'message-row jarvis'; row.id = 'typing-indicator'; row.append(createAvatar());
  const bubble = document.createElement('div'); bubble.className = 'typing-bubble';
  bubble.innerHTML = '<span></span><span></span><span></span><b>Jarvis is typing</b>';
  row.append(bubble); messagesElement.append(row); scrollToLatest();
}

function removeTyping() { document.querySelector('#typing-indicator')?.remove(); }

function setBusy(isBusy) {
  waitingForReply = isBusy; sendButton.disabled = isBusy; input.disabled = isBusy;
}

function resetChat() {
  conversation = []; messagesElement.replaceChildren();
  documentContext = ''; documentInput.value = ''; documentStatus.hidden = true;
  savedMessageCount = 0; userName = '';
  addMessage('jarvis', intro);
  input.value = ''; input.focus();
}

function chooseJarvisVoice() {
  if (!('speechSynthesis' in window)) return;
  const voices = speechSynthesis.getVoices();
  const englishVoices = voices.filter(voice => voice.lang.toLowerCase().startsWith('en'));
  const preferredNames = userVoicePreference === 'female'
    ? [
        /microsoft (aria|ava|jenny|zira|hazel|susan|sonia|natasha)/i,
        /google (uk english female|us english female)/i,
        /samantha|victoria|karen/i
      ]
    : [
        /microsoft (andrew|brian|christopher|eric|davis|ryan|guy|david|mark)/i,
        /google (uk english male|us english)/i,
        /daniel|alex/i
      ];
  const genderedName = userVoicePreference === 'female' ? /female|woman|girl/i : /male|man|boy/i;
  jarvisVoice = preferredNames
    .map(name => englishVoices.find(voice => name.test(voice.name)))
    .find(Boolean)
    || englishVoices.find(voice => genderedName.test(voice.name))
    || englishVoices[0]
    || voices[0]
    || null;
}

if ('speechSynthesis' in window) {
  chooseJarvisVoice();
  speechSynthesis.addEventListener('voiceschanged', chooseJarvisVoice);
}

voicePreferenceButtons.forEach(button => {
  button.addEventListener('click', () => {
    userVoicePreference = button.dataset.voicePreference;
    chooseJarvisVoice();
    voicePreferenceModal.hidden = true;
    input.focus();
  });
});

function speak(text) {
  if (!voiceChatActive || !('speechSynthesis' in window)) {
    resumeVoiceListening();
    return;
  }
  jarvisIsSpeaking = true;
  const playbackId = ++voicePlaybackId;
  speechSynthesis.cancel();
  const spokenText = text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
  const voice = new SpeechSynthesisUtterance(spokenText);
  // Use a relaxed, conversational rhythm. Female and male preferences are
  // tuned independently while keeping pitch close to natural speech.
  if (jarvisVoice) voice.voice = jarvisVoice;
  voice.lang = jarvisVoice?.lang || 'en-US';
  voice.rate = 0.94;
  voice.pitch = userVoicePreference === 'female' ? 1.04 : 0.98;
  voice.volume = 1;
  voice.onend = () => {
    if (playbackId !== voicePlaybackId) return;
    jarvisIsSpeaking = false;
    resumeVoiceListening();
  };
  voice.onerror = () => {
    if (playbackId !== voicePlaybackId) return;
    jarvisIsSpeaking = false;
    resumeVoiceListening();
  };
  speechSynthesis.speak(voice);
}

function autoResize() { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 150)}px`; }

function detectName(message) {
  // Recognises natural replies such as “My name is Ada”, “Call me Ada”, or “I’m Ada”.
  const named = message.match(/(?:my name is|call me|i am|i'm)\s+([a-z][a-z' -]{0,30})/i);
  if (named) return named[1].trim().split(/\s+/).map(word => word[0].toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  // A one-word first reply is commonly a simple answer to “What should I call you?”.
  if (conversation.length === 0 && /^[a-z][a-z'-]{1,24}$/i.test(message.trim())) return message.trim();
  return '';
}

async function getJarvisReply(onChunk) {
  if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
    throw new Error('Add your Groq API key to config.js before chatting.');
  }
  // Groq uses an OpenAI-compatible chat-completions API.
  const endpoint = 'https://api.groq.com/openai/v1/chat/completions';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: `You are Jarvis 2.0, a warm, emotionally aware, practical AI companion. Be friendly, calm, respectful, and concise. Help people think through everyday problems, emotional challenges, relationships, goals, habits, and physical-wellbeing questions with clear next steps.

Build rapport naturally: when appropriate, ask one gentle, relevant follow-up question about the user's day, work or studies, goals, feelings, situation, or what they have already tried. Do not interrogate, make assumptions, shame the user, or force small talk when they ask a direct question. Listen first, acknowledge feelings without exaggerating them, and offer practical options the user can choose from.

For health or medical questions, provide general educational information, sensible low-risk self-care ideas, and questions that help the user describe symptoms. Do not diagnose, prescribe, claim certainty, or replace a clinician. Encourage a qualified healthcare professional for persistent, worsening, severe, or unclear symptoms. If the user describes a possible emergency or immediate danger (for example trouble breathing, chest pain, stroke symptoms, severe bleeding, poisoning, overdose, or thoughts of self-harm), clearly tell them to contact local emergency services or an urgent medical/crisis service now, seek a trusted person nearby, and keep your response focused on immediate safety.

For emotional distress, be supportive and grounded. If there is a risk of self-harm or harm to others, ask whether they are in immediate danger, encourage contacting emergency services or a local crisis line, and encourage reaching out to someone trusted nearby. Never imply you are human, a doctor, therapist, or emergency service.

${userVoicePreference ? `The user selected a ${userVoicePreference} voice preference for this chat. Respect that choice when it is relevant, but do not stereotype or make assumptions about them.` : ''}
${userName ? `The user's name is ${userName}. Use it naturally, not in every sentence.` : 'The user has not shared a name. You may ask what they prefer to be called when it fits naturally, but still answer their question.'}` },
        ...(documentContext ? [{ role: 'system', content: `The user attached this document. Use it as context when relevant:\n\n${documentContext}` }] : []),
        ...conversation
      ],
      temperature: 0.7,
      max_tokens: 700,
      stream: true
    })
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error?.message || 'The AI service could not be reached.');
  }
  if (!response.body) throw new Error('The AI service did not provide a response stream.');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';

  const processLine = line => {
    const data = line.trim();
    if (!data.startsWith('data:')) return;
    const payload = data.slice(5).trim();
    if (!payload || payload === '[DONE]') return;
    try {
      const chunk = JSON.parse(payload);
      const content = chunk.choices?.[0]?.delta?.content;
      if (!content) return;
      text += content;
      onChunk(content);
    } catch (_) {
      // Ignore incomplete keep-alive or metadata events in the SSE stream.
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop();
    lines.forEach(processLine);
    if (done) break;
  }
  if (buffer) processLine(buffer);
  text = text.trim();
  if (!text) throw new Error('Jarvis did not return a message. Please try again.');
  return text;
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text || waitingForReply) return;
  if (!userName) userName = detectName(text);
  addMessage('user', text);
  conversation.push({ role: 'user', content: text });
  input.value = ''; autoResize(); setBusy(true); showTyping();
  try {
    let replyBubble = null;
    const reply = await getJarvisReply(chunk => {
      removeTyping();
      if (!replyBubble) {
        replyBubble = addMessage('jarvis', '');
        replyBubble.classList.add('is-streaming');
      }
      replyBubble.textContent += chunk;
      scrollToLatest();
    });
    removeTyping();
    replyBubble?.classList.remove('is-streaming');
    conversation.push({ role: 'assistant', content: reply });
    speak(reply);
  } catch (error) {
    removeTyping(); addMessage('jarvis', error.message, true);
    // Remove the unsent user turn so a retry does not duplicate it.
    conversation.pop();
  } finally { setBusy(false); input.focus(); resumeVoiceListening(); }
});

input.addEventListener('input', autoResize);
input.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); }
});
document.querySelector('#new-chat').addEventListener('click', () => {
  if (!waitingForReply && (conversation.length === 0 || confirm('Start a new chat? Your current conversation will be cleared.'))) resetChat();
});

documentInput.addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  const maxCharacters = 24000;
  try {
    const text = await file.text();
    if (!text.trim()) throw new Error('This document has no readable text.');
    documentContext = text.slice(0, maxCharacters);
    documentName.textContent = text.length > maxCharacters ? `${file.name} (first 24,000 characters)` : file.name;
    documentStatus.hidden = false;
  } catch (error) {
    documentContext = '';
    alert(error.message || 'Jarvis could not read this document. Use a text, Markdown, CSV, or JSON file.');
  }
});
document.querySelector('#remove-document').addEventListener('click', () => {
  documentContext = ''; documentInput.value = ''; documentStatus.hidden = true;
});

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US'; recognition.interimResults = false; recognition.maxAlternatives = 1;

  async function requestMicrophonePermission() {
    if (microphonePermissionGranted || !navigator.mediaDevices?.getUserMedia) return true;
    if (microphonePermissionRequest) return microphonePermissionRequest;
    microphonePermissionRequest = navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        // SpeechRecognition manages its own audio input. Releasing this stream keeps
        // the microphone free while retaining the permission granted by the user.
        stream.getTracks().forEach(track => track.stop());
        microphonePermissionGranted = true;
        return true;
      })
      .catch(() => false)
      .finally(() => { microphonePermissionRequest = null; });
    return microphonePermissionRequest;
  }
  
  function updateVoiceButton() {
    voiceButton.classList.toggle('active', voiceChatActive);
    const isActive = voiceChatActive;
    voiceButton.innerHTML = isActive
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="1"></rect></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14.5a3 3 0 0 0 3-3v-5a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z"></path><path d="M18 11.5a6 6 0 0 1-12 0M12 17.5v3M8.5 20.5h7"></path></svg>';
    voiceButton.title = isActive ? 'Stop voice chat' : 'Speak to Jarvis';
    voiceButton.setAttribute('aria-label', voiceButton.title);
    voiceButton.setAttribute('aria-pressed', String(voiceChatActive));
  }

  resumeVoiceListening = () => {
    if (!voiceChatActive || waitingForReply || jarvisIsSpeaking || recognitionRunning) return;
    try { recognition.start(); } catch (_) { /* Recognition is already starting; its event handlers will continue the session. */ }
  };

  function stopVoiceChat() {
    voiceChatActive = false;
    jarvisIsSpeaking = false;
    voicePlaybackId += 1;
    window.speechSynthesis?.cancel();
    // Abort rather than wait for the current phrase to finish. The onend handler
    // sees voiceChatActive is false, so listening cannot restart automatically.
    if (recognitionRunning) recognition.abort();
    updateVoiceButton();
  }

  recognition.onstart = () => { recognitionRunning = true; };
  recognition.onend = () => {
    recognitionRunning = false;
    // Recognition naturally ends after each utterance, so restart it while the session remains active.
    if (voiceChatActive && !waitingForReply && !jarvisIsSpeaking) setTimeout(resumeVoiceListening, 150);
  };
  recognition.onerror = event => {
    recognitionRunning = false;
    if (event.error === 'aborted' && !voiceChatActive) return;
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      stopVoiceChat();
      alert('Voice input could not start. Please allow microphone access and try again.');
    }
  };
  recognition.onresult = event => {
    input.value = event.results[0][0].transcript;
    autoResize();
    form.requestSubmit();
    // Do not leave recognition running while Jarvis is preparing and speaking a reply.
    if (recognitionRunning) recognition.stop();
  };
  voiceButton.addEventListener('click', async () => {
    if (voiceChatActive) { stopVoiceChat(); return; }
    const permissionGranted = await requestMicrophonePermission();
    if (!permissionGranted) {
      alert('Voice input could not start. Please allow microphone access and try again.');
      return;
    }
    voiceChatActive = true;
    updateVoiceButton();
    resumeVoiceListening();
  });
  updateVoiceButton();
} else {
  voiceButton.hidden = true;
}
document.querySelector('#save-chat').addEventListener('click', () => {
  const rows = [...document.querySelectorAll('.message-row')];
  const now = new Date();
  const lines = [`Jarvis 2.0 Chat Export`, `Saved: ${now.toLocaleString()}`, ''];
  rows.forEach(row => { const who = row.classList.contains('user') ? 'You' : 'Jarvis'; lines.push(`[${now.toLocaleTimeString()}] ${who}: ${row.querySelector('.message-bubble')?.textContent || ''}`, ''); });
  const file = new Blob([lines.join('\n')], { type: 'text/plain' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(file); link.download = `jarvis-chat-${now.toISOString().slice(0, 10)}.txt`; link.click(); URL.revokeObjectURL(link.href);
  savedMessageCount = conversation.length;
});

// Browsers only permit their own native prompt for refresh, closing a tab, or browser navigation.
function hasUnsavedChat() { return conversation.length > savedMessageCount; }
function beforeUnload(event) {
  if (!hasUnsavedChat()) return;
  event.preventDefault();
  event.returnValue = '';
}
window.addEventListener('beforeunload', beforeUnload);

const leaveNotice = document.querySelector('#leave-notice');
document.querySelectorAll('a[href="index.html"]').forEach(link => {
  link.addEventListener('click', event => {
    if (!hasUnsavedChat()) return;
    event.preventDefault(); pendingLeaveUrl = link.href; leaveNotice.hidden = false;
  });
});
document.querySelector('#stay-button').addEventListener('click', () => { leaveNotice.hidden = true; pendingLeaveUrl = ''; });
document.querySelector('#leave-button').addEventListener('click', () => {
  window.removeEventListener('beforeunload', beforeUnload);
  window.location.href = pendingLeaveUrl || 'index.html';
});

resetChat();
voicePreferenceButtons[0]?.focus();
