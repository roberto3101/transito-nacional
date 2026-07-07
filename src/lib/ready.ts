/**
 * Ejecuta `fn` en cuanto el DOM está listo Y en cada navegación suave
 * (View Transitions). Cubre el caso dev en que el módulo carga después
 * de `window.load` y el `astro:page-load` inicial ya pasó.
 * Las funciones registradas deben ser idempotentes.
 */
export function onReady(fn: () => void): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => fn(), { once: true });
  } else {
    fn();
  }
  document.addEventListener('astro:page-load', () => fn());
}
