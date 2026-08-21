#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASSET_ROOT="$ROOT/artifacts/social-2026-08-15"
SOURCE_DIR="$ASSET_ROOT/source"
FINAL_DIR="$ASSET_ROOT/final"
FRAME_DIR="$ASSET_ROOT/video-frames"

mkdir -p "$FINAL_DIR" "$FRAME_DIR"

for required in \
  "$FINAL_DIR/narita-access-now-x-linkedin-1200x630.png" \
  "$FINAL_DIR/narita-access-now-instagram-1080x1350.png" \
  "$FRAME_DIR/video-01.png" \
  "$FRAME_DIR/video-02.png" \
  "$FRAME_DIR/video-03.png" \
  "$FRAME_DIR/video-04.png" \
  "$FRAME_DIR/video-05.png" \
  "$FRAME_DIR/video-06.png" \
  "$SOURCE_DIR/01-current-status.png"; do
  if [[ ! -f "$required" ]]; then
    echo "Missing rendered asset: $required" >&2
    exit 1
  fi
done

ffmpeg -y \
  -loop 1 -t 3 -i "$FRAME_DIR/video-01.png" \
  -loop 1 -t 3 -i "$FRAME_DIR/video-02.png" \
  -loop 1 -t 3 -i "$FRAME_DIR/video-03.png" \
  -loop 1 -t 3 -i "$FRAME_DIR/video-04.png" \
  -loop 1 -t 3 -i "$FRAME_DIR/video-05.png" \
  -loop 1 -t 3 -i "$FRAME_DIR/video-06.png" \
  -filter_complex "[0:v]format=yuv420p,setsar=1[v0];[1:v]format=yuv420p,setsar=1[v1];[2:v]format=yuv420p,setsar=1[v2];[3:v]format=yuv420p,setsar=1[v3];[4:v]format=yuv420p,setsar=1[v4];[5:v]format=yuv420p,setsar=1[v5];[v0][v1]xfade=transition=fade:duration=0.5:offset=2.5[x1];[x1][v2]xfade=transition=fade:duration=0.5:offset=5.0[x2];[x2][v3]xfade=transition=fade:duration=0.5:offset=7.5[x3];[x3][v4]xfade=transition=fade:duration=0.5:offset=10.0[x4];[x4][v5]xfade=transition=fade:duration=0.5:offset=12.5[v]" \
  -map "[v]" -t 15.5 -r 30 -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -movflags +faststart \
  "$FINAL_DIR/narita-access-now-short-1080x1920.mp4"

magick "$SOURCE_DIR/01-current-status.png" -quality 92 "$FINAL_DIR/narita-access-now-ui-screenshot.jpg"

echo "Built social assets in $FINAL_DIR"
