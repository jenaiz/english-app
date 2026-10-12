# Marca

- `icon-source.png`: el icono original (generado con ChatGPT), 1254×1254 con fondo transparente.
- `icon-square.png`: el mismo icono recortado y centrado en 1024×1024. Es la base de los iconos de `frontend/public/`.
- `og-image.html`: fuente de `frontend/public/og-image.png` (la imagen de 1200×630 al compartir en redes).
- `frontend/public/favicon.svg` es una versión vectorial del icono hecha a mano. Si cambia el icono, hay que rehacerla.

Para regenerar todo, desde la raíz del repo (los PNG de `frontend/public` se aligeran además con `-strip +dither -colors 256`):

```bash
B=assets/brand P=frontend/public
magick $B/icon-source.png -trim +repage -background none -gravity center -extent 900x900 -resize 1024x1024 $B/icon-square.png
magick $B/icon-square.png -define icon:auto-resize=48,32,16 $P/favicon.ico
magick $B/icon-square.png -resize 192x192 $P/icon-192.png
magick $B/icon-square.png -resize 512x512 $P/icon-512.png
magick -size 512x512 xc:white \( $B/icon-square.png -resize 360x360 \) -gravity center -composite $P/icon-maskable-512.png
magick -size 180x180 xc:white \( $B/icon-square.png -resize 150x150 \) -gravity center -composite $P/apple-touch-icon.png
# Chrome renders the page with the Bricolage font from node_modules (run npm install in frontend first).
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars --allow-file-access-from-files \
  --window-size=1200,630 --screenshot=$PWD/$P/og-image.png file://$PWD/$B/og-image.html
```
