# Bleed · Directrices del Proyecto Antigravity

Este proyecto está desarrollado íntegramente con Antigravity (Google DeepMind) y modelos Gemini.
Prohibido el uso de APIs o herramientas de Claude (Anthropic) o Codex (OpenAI).

## Reglas de Arquitectura y Front
- **Next.js 16 + React 19**: En Next.js 16, `params` y `searchParams` en componentes de servidor son Promises (`Promise<{ [key: string]: string | undefined }>`).
- **Diseño y Verificación**:
  - Un solo fondo en toda la aplicación: `--tinta: #0e1113` (sin fondos blancos ni contrastes planos).
  - Tipografías oficiales: Instrument Sans (`--font-instrument`) y IBM Plex Mono (`--font-plex-mono`).
  - Cero desborde horizontal (`scrollWidth <= clientWidth`).
  - Exactamente un único `h1` por página.
  - Ningún texto por debajo de 12px (mínimo `0.75rem` / `12px`).
  - Ningún elemento de texto/botón con `opacity < 0.99`. Usar colores sólidos (`--papel-tenue`, `--papel-debil`).
  - El movimiento se gana su sitio: animación de entrada única con `@keyframes entrar`.
- **Rigor en los datos**:
  - Cada cifra muestra el supuesto y la fórmula matemática en pantalla.
  - No inventar datos cuando falten: indicarlo explícitamente y permitir ajuste por el dueño.
  - Calibrado con el estudio de campo de 132 negocios de Málaga.
