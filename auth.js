/* Visual-only account-page interactions and Jarvis welcome voice. */
const welcomeMessage = document.body.dataset.welcomeMessage;
const welcomeVoiceButton = document.querySelector('#welcome-voice-button');
let welcomeStarted = false;

function findWelcomeVoice() {
  const voices = speechSynthesis.getVoices().filter(voice => voice.lang.toLowerCase().startsWith('en'));
  const preferredVoices = voices.filter(voice => /microsoft (aria|ava|jenny|andrew|brian|ryan|guy)|google us english|samantha|alex/i.test(voice.name));
  return preferredVoices.find(voice => /natural|neural|online/i.test(voice.name)) || preferredVoices[0] || voices.find(voice => /natural|neural|online/i.test(voice.name)) || voices[0];
}

function speakWelcome() {
  if (!welcomeMessage || !('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(welcomeMessage);
  const voice = findWelcomeVoice();
  if (voice) { utterance.voice = voice; utterance.lang = voice.lang; }
  utterance.rate = 1.07; utterance.pitch = 1.14; utterance.volume = 1;
  utterance.onstart = () => { welcomeStarted = true; welcomeVoiceButton.hidden = true; };
  utterance.onerror = () => { welcomeVoiceButton.hidden = false; };
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
  window.setTimeout(() => { if (!welcomeStarted) welcomeVoiceButton.hidden = false; }, 1800);
}

welcomeVoiceButton.addEventListener('click', speakWelcome);
window.addEventListener('load', () => window.setTimeout(speakWelcome, 2600));

document.querySelectorAll('[data-preview-form]').forEach(form => {
  form.addEventListener('submit', event => {
    event.preventDefault();
    form.closest('.auth-card').querySelector('.auth-preview-status').textContent = 'Account access is a design preview and is not connected yet.';
  });
});
document.querySelectorAll('[data-social]').forEach(button => {
  button.addEventListener('click', () => {
    button.closest('.auth-card').querySelector('.auth-preview-status').textContent = `${button.dataset.social} sign-in is a design preview and is not connected yet.`;
  });
});
