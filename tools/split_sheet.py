#!/usr/bin/env python3
"""把 N 宫格人物表切成单张立绘。

一次生成一张多格图比一张一张生成快得多，而且同一张图里的人物风格必然一致；
代价是每格的像素数变少，所以格数不能太多——1536×1024 的三宫格每格 512×1024，
裁成 4:5 还有 512×640，仍高于游戏用的 480×600；四格以上就不够了。

用法: tools/split_sheet.py <人物表.png> <key1> <key2> ... [--anchor 0.18]
"""
import sys, os
from PIL import Image

TARGET = (480, 600)          # 游戏内立绘规格 4:5
RATIO = TARGET[0] / TARGET[1]

args = [a for a in sys.argv[1:] if not a.startswith('--')]
anchor = 0.18
for a in sys.argv[1:]:
    if a.startswith('--anchor'):
        anchor = float(a.split('=', 1)[1])
if len(args) < 2:
    sys.exit(__doc__)

src, keys = args[0], args[1:]
im = Image.open(src).convert('RGB')
W, H = im.size
n = len(keys)
pw = W // n
out_dir = 'public/art/portraits'
os.makedirs(out_dir, exist_ok=True)

for i, key in enumerate(keys):
    panel = im.crop((i * pw, 0, (i + 1) * pw, H))
    # 在这一格里裁出 4:5：宽度吃满，高度按比例，位置由 anchor 决定（人脸偏上）
    ch = round(pw / RATIO)
    if ch <= H:
        y0 = round((H - ch) * anchor)
        box = (0, y0, pw, y0 + ch)
    else:                                   # 格子太窄，改成高度吃满、左右居中
        cw = round(H * RATIO)
        x0 = (pw - cw) // 2
        box = (x0, 0, x0 + cw, H)
    cut = panel.crop(box).resize(TARGET, Image.LANCZOS)
    path = f'{out_dir}/{key}.jpg'
    cut.save(path, 'JPEG', quality=82, optimize=True, progressive=True)
    print(f'{key:8s} {box[2]-box[0]}x{box[3]-box[1]} → {TARGET[0]}x{TARGET[1]}  {os.path.getsize(path)//1024} KB')
