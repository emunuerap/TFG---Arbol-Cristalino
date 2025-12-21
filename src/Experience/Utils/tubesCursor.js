// UI/tubesCursor.js
export async function initTubesCursor() {
  if (window.__tubesCursor) return window.__tubesCursor;

  const canvas = document.getElementById('fx-tubes-cursor');
  if (!canvas) return null;

  const mod = await import(
    'https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js'
  );
  const TubesCursor = mod.default || mod;

  // Paleta PORTFOLIO (azul hielo + verde suave + blanco)
  const colors = ['#eaf2ff', '#b4ff3b', '#60aed5']; // ok
const lightsColors = ['#eaf2ff', '#b4ff3b', '#60aed5']; // sin rosa

const app = TubesCursor(canvas, {
  tubes: {
    colors,
    lights: { intensity: 35, colors: lightsColors }, //  mucho menos
  },
});


  window.__tubesCursor = app;
  return app;
}
