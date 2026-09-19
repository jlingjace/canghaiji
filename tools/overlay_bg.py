#!/usr/bin/env python3
"""把提议的对齐线画到背景板上，用来肉眼核对量得准不准。

用法: tools/overlay_bg.py <风格key> <ground> <sea> <top> [x0,x1 x0,x1 x0,x1 x0,x1]
输出: /tmp/align-<key>.png

线的含义：
  绿线 ground —— 建筑落地、路人行走的最上沿，应当压在建筑底部与街面相接处
  蓝线 sea    —— 码头边缘与水面交界，应当压在石岸与水的分界上
  黄线 top    —— 名牌与热区上沿，应当略高于最高的屋顶
  红框 spots  —— 四栋建筑各自的横向范围
"""
import sys, os
from PIL import Image, ImageDraw

if len(sys.argv) < 5: sys.exit(__doc__)
key, ground, sea, top = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4])
spots = []
for a in sys.argv[5:9]:
    x0, x1 = a.split(','); spots.append((float(x0), float(x1)))

src = f'public/art/ports/{key}.jpg'
im = Image.open(src).convert('RGB'); W, H = im.size
d = ImageDraw.Draw(im)
def hline(f, col, label):
    y = round(H * f)
    d.line([(0, y), (W, y)], fill=col, width=3)
    d.text((6, max(0, y - 16)), f'{label} {f:.3f}', fill=col)
hline(top, (255, 214, 64), 'top')
hline(ground, (80, 230, 120), 'ground')
hline(sea, (90, 170, 255), 'sea')
for i, (x0, x1) in enumerate(spots):
    a, b = round(W * x0), round(W * x1)
    d.rectangle([a, round(H * top), b, round(H * ground)], outline=(255, 90, 90), width=3)
    d.text((a + 6, round(H * top) + 6), str(i + 1), fill=(255, 90, 90))
out = f'/tmp/align-{key}.png'
im.save(out)
print(out)
