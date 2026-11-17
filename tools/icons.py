"""Genereert de app-iconen (PNG) zonder externe libraries: groen vlak met maansikkel en drie 'wortel'-punten."""
import zlib, struct, sys, os
def png(path, size):
    S = 3  # supersampling
    bg, fg = (31, 95, 74), (246, 240, 222)
    cx, cy = size * 0.47, size * 0.47
    R, r2, off = size * 0.30, size * 0.25, size * 0.12
    dots = [(size * 0.60, size * 0.38), (size * 0.73, size * 0.33), (size * 0.70, size * 0.49)]
    dr = size * 0.045
    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            hit = 0
            for sy in range(S):
                for sx in range(S):
                    px, py = x + (sx + .5) / S, y + (sy + .5) / S
                    inC = (px - cx) ** 2 + (py - cy) ** 2 <= R * R and (px - cx - off) ** 2 + (py - cy + off * .6) ** 2 > r2 * r2
                    inD = any((px - dx) ** 2 + (py - dy) ** 2 <= dr * dr for dx, dy in dots)
                    hit += inC or inD
            t = hit / (S * S)
            row += bytes(round(bg[k] * (1 - t) + fg[k] * t) for k in range(3))
        rows.append(bytes(row))
    raw = zlib.compress(b''.join(rows), 9)
    chunk = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)) + chunk(b'IDAT', raw) + chunk(b'IEND', b''))
out = sys.argv[1]
for n in (192, 512, 180):
    png(os.path.join(out, f'icon-{n}.png'), n)
