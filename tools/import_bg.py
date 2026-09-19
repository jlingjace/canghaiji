#!/usr/bin/env python3
"""把港口背景板压到游戏规格并放进 public/art/ports/。
用法: tools/import_bg.py <风格key> <源文件>"""
import sys, os
from PIL import Image
if len(sys.argv) != 3: sys.exit(__doc__)
key, src = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
# 1536 宽足够覆盖 2 倍 DPR 下的画布；再大只是浪费带宽
if im.width > 1536:
    im = im.resize((1536, round(im.height * 1536 / im.width)), Image.LANCZOS)
os.makedirs('public/art/ports', exist_ok=True)
path = f'public/art/ports/{key}.jpg'
im.save(path, 'JPEG', quality=82, optimize=True, progressive=True)
print(f'{key}  {im.width}x{im.height}  {os.path.getsize(path)//1024} KB')
