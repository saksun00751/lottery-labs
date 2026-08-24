import { publicEnv } from '@/config/env.public';

/**
 * Runs before first paint so the page never flashes the default palette.
 *
 * Kept as a raw string on purpose: a React component would only run after
 * hydration, which is exactly the flash we are avoiding.
 */
export function ThemeScript() {
  const script = `
(function () {
  try {
    var root = document.documentElement;
    var theme = localStorage.getItem('ll:theme') || ${JSON.stringify(publicEnv.defaultTheme)};
    var mode = localStorage.getItem('ll:mode') || ${JSON.stringify(publicEnv.defaultColorMode)};
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-mode', mode);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', ${JSON.stringify(publicEnv.defaultTheme)});
    document.documentElement.setAttribute('data-mode', ${JSON.stringify(publicEnv.defaultColorMode)});
  }
})();`.trim();

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
