export function setA11yHidden(container, hidden) {
    if (!container) return;
  
    container.setAttribute('aria-hidden', hidden ? 'true' : 'false');
  
    // Bloquea tabulación dentro cuando está oculto
    const focusables = container.querySelectorAll(
      'a, button, input, textarea, select, details, summary, [tabindex]'
    );
  
    focusables.forEach((el) => {
      // No tocamos elementos que ya son aria-hidden explícitos (decoración)
      if (el.closest('[aria-hidden="true"]')) return;
  
      if (hidden) {
        if (!el.hasAttribute('data-prev-tabindex')) {
          const prev = el.getAttribute('tabindex');
          el.setAttribute('data-prev-tabindex', prev == null ? '' : prev);
        }
        el.setAttribute('tabindex', '-1');
      } else {
        const prev = el.getAttribute('data-prev-tabindex');
        if (prev === '') el.removeAttribute('tabindex');
        else if (prev != null) el.setAttribute('tabindex', prev);
        el.removeAttribute('data-prev-tabindex');
      }
    });
  }
  
  export function focusSmart(container, selectors) {
    if (!container) return;
  
    const list = Array.isArray(selectors) ? selectors : [selectors];
    for (const sel of list) {
      const el = container.querySelector(sel);
      if (el && typeof el.focus === 'function') {
        el.focus({ preventScroll: true });
        return true;
      }
    }
    return false;
  }
  
  export function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  }
  