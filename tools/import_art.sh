#!/bin/sh
# 把下载来的立绘压成游戏用的规格：4:5、600px 高、JPEG。
# 用法：tools/import_art.sh <角色key> <源文件>
set -e
[ $# -eq 2 ] || { echo "用法: $0 <key> <源文件>"; exit 1; }
OUT="public/art/portraits/$1.jpg"
mkdir -p public/art/portraits
sips -Z 600 --setProperty format jpeg --setProperty formatOptions 80 "$2" --out "$OUT" >/dev/null
printf '%s  %s  %s KB\n' "$1" "$(sips -g pixelWidth -g pixelHeight "$OUT" | tail -2 | tr -d ' \n' | sed 's/pixelWidth:/ /;s/pixelHeight:/x/')" "$(( $(stat -f%z "$OUT") / 1024 ))"
