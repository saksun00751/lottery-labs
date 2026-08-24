import { publicEnv } from '@/config/env.public';

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

  // React 19 warns that inline <script> tags in components won't re-execute
  // during client navigation. That is intentional here — this script only needs
  // to run once from the SSR HTML to prevent a theme flash before hydration.
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
