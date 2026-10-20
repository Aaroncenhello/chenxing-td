# 把打包出来的 PNG 转成调色板 PNG（无损，颜色数 ≤ 256 才转）：浏览器导出的是满色 RGBA，LPC 精灵一般只有几十种颜色，体积能缩到 1/5 左右
# 用法：python3 tools/lpc/shrink.py tools/lpc/pack-skins tools/lpc/pack-foes
import sys, glob, os
from PIL import Image
tot0 = tot1 = 0
for d in sys.argv[1:]:
    for f in sorted(glob.glob(os.path.join(d, '*.png'))):
        im = Image.open(f).convert('RGBA'); px = list(im.getdata()); cols = sorted(set(px)); s0 = os.path.getsize(f)
        if len(cols) > 256: print('颜色太多，跳过', f, len(cols)); tot0 += s0; tot1 += s0; continue
        idx = {c: i for i, c in enumerate(cols)}
        p = Image.new('P', im.size); p.putdata([idx[c] for c in px]); p.putpalette([v for c in cols for v in c[:3]])
        p.save(f, optimize=True, transparency=bytes(c[3] for c in cols))
        chk = Image.open(f).convert('RGBA'); assert list(chk.getdata()) == px, '转换后像素不一致：' + f
        tot0 += s0; tot1 += os.path.getsize(f)
print('%.1fKB → %.1fKB' % (tot0 / 1024, tot1 / 1024))
