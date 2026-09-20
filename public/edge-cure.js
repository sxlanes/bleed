/**
 * Edge Cure Injection Script
 * 
 * Este script se encarga de inyectar dinámicamente etiquetas y configuraciones
 * necesarias en el <head> del sitio web del cliente sin requerir cambios en el backend.
 * 
 * Uso:
 * 1. Definir la configuración (opcional) antes de cargar el script:
 *    window.__EDGE_CURE_CONFIG__ = {
 *      jsonLd: {
 *        "@context": "https://schema.org",
 *        "@type": "LocalBusiness",
 *        "name": "Nombre del Negocio"
 *      }
 *    };
 * 2. Incluir este script en el HTML.
 */
(function() {
  // Asegurarnos de que estamos en un entorno de navegador
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // 1. Inyectar etiqueta meta viewport si falta
  function ensureViewportMeta() {
    var hasViewport = document.querySelector('meta[name="viewport"]');
    if (!hasViewport) {
      var meta = document.createElement('meta');
      meta.name = "viewport";
      meta.content = "width=device-width, initial-scale=1.0";
      document.head.appendChild(meta);
      console.info("[Edge Cure] Etiqueta <meta name=\"viewport\"> inyectada.");
    }
  }

  // 2. Inyectar JSON-LD si hay configuración disponible
  function injectJsonLd() {
    var config = window.__EDGE_CURE_CONFIG__ || {};
    if (config.jsonLd) {
      // Evitar inyecciones duplicadas
      var existingScripts = document.querySelectorAll('script[type="application/ld+json"]');
      var alreadyInjected = Array.from(existingScripts).some(function(script) {
        try {
          return script.innerText.includes(config.jsonLd['@type']); // Heurística simple
        } catch (e) {
          return false;
        }
      });

      if (!alreadyInjected) {
        var script = document.createElement('script');
        script.type = "application/ld+json";
        script.text = JSON.stringify(config.jsonLd);
        document.head.appendChild(script);
        console.info("[Edge Cure] Datos estructurados JSON-LD inyectados.");
      }
    }
  }

  // Ejecutar las funciones al cargar
  function init() {
    ensureViewportMeta();
    injectJsonLd();
  }

  // Si el DOM ya está listo, ejecutar inmediatamente, si no, esperar al evento
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
