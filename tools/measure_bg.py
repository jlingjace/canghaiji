#!/usr/bin/env python3
"""量出背景板的对齐线：街面基线与水面起始行。

sea   —— 从底往上找「水色占优」的连续区段的顶端（水在画面最下方）
ground—— 建筑区竖向结构强、街面平坦，找横向色彩方差骤降的那一行
量完的比例填进 src/art_assets.js。
"""
import sys, glob, os
from PIL import Image

def measure(path):
    im = Image.open(path).convert('RGB'); W, H = im.size
    px = im.load()
    xs = range(0, W, 6)

    def waterish(y):
        n = hit = 0
        for x in xs:
            r, g, b = px[x, y]; n += 1
            if (b > r + 10 or g > r + 6) and (b + g) > 120: hit += 1
        return hit / n

    sea = H
    for y in range(H - 1, int(H * 0.55), -1):
        if waterish(y) > 0.62: sea = y
        elif sea < H and y < sea - 6: break

    def rowvar(y):
        vals = []
        for x in xs:
            r, g, b = px[x, y]; vals.append(0.299 * r + 0.587 * g + 0.114 * b)
        m = sum(vals) / len(vals)
        return sum((v - m) ** 2 for v in vals) / len(vals)

    lo, hi = int(H * 0.60), min(sea, int(H * 0.86))
    best, bestdrop = hi, 0
    for y in range(lo, hi - 8):
        a = sum(rowvar(y - k) for k in range(0, 5)) / 5
        b = sum(rowvar(y + k) for k in range(3, 8)) / 5
        if a - b > bestdrop: bestdrop, best = a - b, y
    return best / H, sea / H

files = sys.argv[1:] or sorted(glob.glob('public/art/ports/*.jpg'))
print(f'{"风格":<14}{"ground":>8}{"sea":>8}')
for f in files:
    g, s = measure(f)
    print(f'{os.path.basename(f)[:-4]:<14}{g:>8.3f}{s:>8.3f}')
