// Show the Jarvis loading screen for 2.5 seconds on every page visit.
window.addEventListener('load', () => {
  window.setTimeout(() => {
    const preloader = document.querySelector('#page-preloader');
    preloader?.classList.add('is-hidden');
    document.body.classList.remove('is-loading');
    window.setTimeout(() => preloader?.remove(), 450);
  }, 2500);
});
