// Applies the stored or system theme before first paint (no flash of the wrong theme).
// Loaded as a nonce'd external script from src/app/[locale]/layout.tsx; keep it tiny.
(function () {
  try {
    var stored = localStorage.getItem('kingsejong-theme');
    var dark = stored === 'dark' || (stored !== 'light' && !window.matchMedia('(prefers-color-scheme: light)').matches);
    var classes = document.documentElement.classList;
    classes.add(dark ? 'dark' : 'light');
    classes.remove(dark ? 'light' : 'dark');
  } catch {
    // Storage blocked: fall back to the dark default explicitly.
    document.documentElement.classList.add('dark');
  }
})();
