#!/usr/bin/env bash
#
# optimize-assets.sh — Regenera los assets optimizados de la landing.
#
# Tooling requerido (one-off):
#   pip:  python3 -m pip install --user fonttools brotli   # pyftsubset / fontTools.subset
#   brew: brew install webp ffmpeg                          # cwebp / ffmpeg
#
# Restricción de static-i18n: solo reescribe rutas en img[src], source[src],
# script[src], audio[src], video[src], link[href]. NO reescribe srcset ni poster.
# Por eso el hero y los thumbnails se sirven como <img src="...webp"> directo
# (sin <picture>/srcset) y los demos como <video><source src="...mp4">.
#
# Las imágenes/vídeos optimizados se commitean. Los FUENTES (PNG/JPG/GIF originales
# y la fuente Material Symbols completa de 449 KB) NO se publican; recupéralos de
# git history si necesitas regenerar:
#   git show <commit>:fonts/material-symbols-outlined.woff2 > /tmp/ms-full.woff2
#   git show <commit>:assets/demos/<name>.gif > assets/demos/<name>.gif
#
set -euo pipefail
cd "$(dirname "$0")/.."

# --- 1) Subset de la fuente de iconos (Material Symbols Outlined) ---------------
# Escanea TODOS los iconos usados en el HTML (ligaduras tras la clase) + margen UI,
# y subsetea la fuente completa (FULL_FONT) reteniendo solo esos glyphs.
FULL_FONT="${FULL_FONT:-/tmp/ms-full.woff2}"   # fuente completa (de git history)
if [ -f "$FULL_FONT" ]; then
  MARGIN="close menu check done info open_in_new expand_more expand_less content_copy arrow_upward arrow_downward more_vert"
  ICONS="$(grep -rho 'material-symbols-outlined">[^<]*' src/ | sed 's/.*>//' | tr -d ' ' | sort -u | tr '\n' ' ') $MARGIN"
  # Resuelve cada nombre -> glyph de salida vía las ligaduras del GSUB,
  # luego subsetea con --no-layout-closure (evita arrastrar los ~6000 iconos).
  python3 - "$FULL_FONT" "$ICONS" <<'PY' > /tmp/icon_glyphs.txt
import sys
from fontTools.ttLib import TTFont
f = TTFont(sys.argv[1]); cmap = f.getBestCmap()
lig = {}
for lk in f['GSUB'].table.LookupList.Lookup:
    for st in lk.SubTable:
        s = getattr(st, 'ExtSubTable', st)
        for first, ll in (getattr(s, 'ligatures', None) or {}).items():
            for l in ll: lig[tuple([first] + list(l.Component))] = l.LigGlyph
out = []
for n in sys.argv[2].split():
    try: out.append(lig[tuple(cmap[ord(c)] for c in n)])
    except KeyError: pass
print(','.join(sorted(set(out))))
PY
  python3 -m fontTools.subset "$FULL_FONT" \
    --glyphs-file=/tmp/icon_glyphs.txt --text="$ICONS" \
    --layout-features='liga,dlig,clig,calt,rlig,ccmp' --no-layout-closure \
    --flavor=woff2 --output-file=fonts/material-symbols-outlined.woff2
  echo "font subset: $(wc -c < fonts/material-symbols-outlined.woff2) bytes"
else
  echo "SKIP font subset: falta $FULL_FONT (recupéralo de git history)"
fi

# --- 2) Hero (elemento LCP): PNG -> WebP ----------------------------------------
[ -f assets/hero-screenshot.png ] && \
  cwebp -q 80 assets/hero-screenshot.png -o assets/hero-screenshot.webp

# --- 3) Thumbnails de demos: JPG -> WebP ----------------------------------------
for f in assets/demos/*-thumb.jpg; do
  [ -f "$f" ] && cwebp -q 72 "$f" -o "${f%.jpg}.webp"
done

# --- 4) Demos: GIF -> MP4 (h264) ------------------------------------------------
# Solo MP4: vp9/WebM resultó MÁS grande que h264 en estos clips y h264 es universal.
SCALE="scale=trunc(iw/2)*2:trunc(ih/2)*2"
for f in assets/demos/*.gif; do
  [ -f "$f" ] || continue
  ffmpeg -y -i "$f" -movflags +faststart -pix_fmt yuv420p -crf 30 -vf "$SCALE" -an "${f%.gif}.mp4"
done

echo "Done. Re-medir con la skill pagespeed (móvil) tras 'npm run build'."
