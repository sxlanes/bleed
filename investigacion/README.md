# Investigación de campo

Prototipo del motor de reconocimiento, escrito el 9-sep-2026 para calibrar la cuantificación
con negocios reales en vez de con supuestos.

- `overpass-malaga.txt` — consulta a OpenStreetMap que devuelve restaurantes con web propia
  en un área. Gratis, sin autenticación, y sirve igual como generador de leads.
- `recon.py` — auditoría en paralelo: estado, TTFB, peso de imágenes, WordPress, WooCommerce,
  enlaces a agregadores, pedido propio, viewport móvil y apertura de la Store API.

`datos/` está fuera del control de versiones a propósito. Contiene el resultado de auditar
132 negocios reales de Málaga con nombre y URL: el motor se publica, la cosecha no.
Se regenera con `python3 recon.py`.
