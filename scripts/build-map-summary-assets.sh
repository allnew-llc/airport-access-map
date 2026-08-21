#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASSET_ROOT="$ROOT/artifacts/social-map-summary-2026-08-15"
SOURCE_DIR="$ASSET_ROOT/source"
FINAL_DIR="$ASSET_ROOT/final"
FRAME_DIR="$ASSET_ROOT/video-frames"

mkdir -p "$FINAL_DIR" "$FRAME_DIR"

for required in \
  "$SOURCE_DIR/current-map-summary.png" \
  "$FINAL_DIR/narita-access-map-summary-x-linkedin-1200x630.png" \
  "$FINAL_DIR/narita-access-map-summary-instagram-1080x1350.png" \
  "$FRAME_DIR/video-01.png" \
  "$FRAME_DIR/video-02.png" \
  "$FRAME_DIR/video-03.png" \
  "$FRAME_DIR/video-04.png" \
  "$FRAME_DIR/video-05.png"; do
  if [[ ! -f "$required" ]]; then
    echo "Missing rendered asset: $required" >&2
    exit 1
  fi
done

ffmpeg -y \
  -loop 1 -t 2.8 -i "$FRAME_DIR/video-01.png" \
  -loop 1 -t 2.8 -i "$FRAME_DIR/video-02.png" \
  -loop 1 -t 2.8 -i "$FRAME_DIR/video-03.png" \
  -loop 1 -t 2.8 -i "$FRAME_DIR/video-04.png" \
  -loop 1 -t 2.8 -i "$FRAME_DIR/video-05.png" \
  -filter_complex "[0:v]format=yuv420p,setsar=1[v0];[1:v]format=yuv420p,setsar=1[v1];[2:v]format=yuv420p,setsar=1[v2];[3:v]format=yuv420p,setsar=1[v3];[4:v]format=yuv420p,setsar=1[v4];[v0][v1]xfade=transition=fade:duration=0.4:offset=2.4[x1];[x1][v2]xfade=transition=fade:duration=0.4:offset=4.8[x2];[x2][v3]xfade=transition=fade:duration=0.4:offset=7.2[x3];[x3][v4]xfade=transition=fade:duration=0.4:offset=9.6[v]" \
  -map "[v]" -t 12.4 -r 30 -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -movflags +faststart \
  "$FINAL_DIR/narita-access-map-summary-short-1080x1920.mp4"

ffmpeg -y \
  -i "$FRAME_DIR/video-01.png" \
  -i "$FRAME_DIR/video-02.png" \
  -i "$FRAME_DIR/video-03.png" \
  -i "$FRAME_DIR/video-04.png" \
  -i "$FRAME_DIR/video-05.png" \
  -filter_complex "[0:v]scale=270:480[v0];[1:v]scale=270:480[v1];[2:v]scale=270:480[v2];[3:v]scale=270:480[v3];[4:v]scale=270:480[v4];[v0][v1][v2][v3][v4]xstack=inputs=5:layout=0_0|270_0|0_480|270_480|0_960:fill=#142033[v]" \
  -map "[v]" -frames:v 1 "$FINAL_DIR/video-contact-sheet.png"

echo "Built current map + summary social assets in $FINAL_DIR"
