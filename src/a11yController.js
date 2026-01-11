import { setA11yHidden, focusSmart } from './Experience/Utils/a11y.js';

export function initA11yController() {
  const sectionsContainer = document.querySelector('.sections-container');
  const rootsHUD = document.querySelector('.roots-immersive-hud');
  const branchesHUD = document.querySelector('.branches-immersive-hud');
  const crownHUD = document.querySelector('.crown-immersive-hud');

  const exitBtn = document.querySelector('#section-exit-btn');

  // Helpers para leer tu estado real (script.js)
  const getImmersiveIndex = () => {
    const b = document.body;
    if (b.classList.contains('is-section-immersive-roots')) return 0;
    if (b.classList.contains('is-section-immersive-branches')) return 1;
    if (b.classList.contains('is-section-immersive-crown')) return 2;
    return -1;
  };

  const isInAnyImmersive = () =>
    document.body.classList.contains('is-section-immersive');

  const focusOnEnter = (idx) => {
    // Nota: focus solo si hay teclado/AT; en móvil no molesta, pero si quieres,
    // podrías condicionar a (pointer:fine). Lo dejamos simple.
    if (idx === 0) {
      // ROOTS: pill activa
      if (focusSmart(rootsHUD, [
        '.roots-pill.is-active',
        '.roots-pill',
        '.roots-detail-panel:not(.is-hidden) button',
      ])) return;
    }

    if (idx === 1) {
      // BRANCHES: si hay CTA dentro de branch-active-info, si no, exit
      if (focusSmart(branchesHUD, [
        '#branch-info-container:not(.hidden) .branch-btn',
        '#branch-info-container:not(.hidden) a.branch-btn',
      ])) return;
    }

    if (idx === 2) {
      // CROWN: tab activo, si no toggle activo, si no CTA
      if (focusSmart(crownHUD, [
        '.crown-tab-btn.is-active',
        '.crown-toggle-btn.is-active',
        '#btn-copy-email',
        '.crown-action-btn.primary',
        '.crown-action-btn',
      ])) return;
    }

    // Fallback: botón de salir (siempre existe y es clave)
    exitBtn?.focus?.({ preventScroll: true });
  };

  const focusOnExit = (prevIdx) => {
    // Devuelve foco al botón “Entrar …” correspondiente en la card
    if (prevIdx >= 0) {
      const btn = document.querySelector(`.section-enter-button[data-section="${prevIdx}"]`);
      if (btn && typeof btn.focus === 'function') {
        btn.focus({ preventScroll: true });
        return;
      }
    }

    // Fallback: primer CTA visible
    const any = document.querySelector('.section-enter-button');
    any?.focus?.({ preventScroll: true });
  };

  let lastIdx = getImmersiveIndex();
  let lastInImmersive = isInAnyImmersive();

  function applyA11y() {
    const idx = getImmersiveIndex();
    const inImmersive = isInAnyImmersive();

    // 1) Overlay de secciones: solo accesible fuera de inmersivo
    setA11yHidden(sectionsContainer, inImmersive);

    // 2) HUDs: solo el activo accesible
    setA11yHidden(rootsHUD, idx !== 0);
    setA11yHidden(branchesHUD, idx !== 1);
    setA11yHidden(crownHUD, idx !== 2);

    // 3) Si acabamos de entrar en inmersivo → focus inteligente
    if (!lastInImmersive && inImmersive) {
      // micro-delay: deja que el DOM aplique clases/transiciones
      setTimeout(() => focusOnEnter(idx), 60);
    }

    // 4) Si acabamos de salir de inmersivo → devolver foco al CTA
    if (lastInImmersive && !inImmersive) {
      const prev = lastIdx;
      setTimeout(() => focusOnExit(prev), 60);
    }

    lastIdx = idx;
    lastInImmersive = inImmersive;
  }

  // Aplicar ya
  applyA11y();

  // Reactivo a cambios de clase en body (tu sistema de estados)
  const obs = new MutationObserver(() => applyA11y());
  obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  // Opcional: tecla Escape para salir de inmersivo (accesibilidad real)
  // Solo si tu UI lo permite sin romper; aquí simplemente dispara click del exitBtn.
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!isInAnyImmersive()) return;
    exitBtn?.click?.();
  });
}
