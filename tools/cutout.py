"""Cut the plain white background out of the pet artwork and emit transparent PNGs."""
import os
import sys
from collections import deque

from PIL import Image, ImageFilter

SRC = r"C:\Users\23646\Desktop\新建文件夹\037e5c03a40ca3b190714faeb5a07c79.jpg"
OUT_PET = r"C:\Users\23646\Documents\deepseek-harness\default-workspace\dsh-desktop-pet\assets\pet.png"
OUT_ICON = r"C:\Users\23646\Documents\deepseek-harness\default-workspace\dsh-desktop-pet\assets\icon.png"

img = Image.open(SRC).convert("RGB")
os.makedirs(os.path.dirname(OUT_PET), exist_ok=True)
w, h = img.size
px = img.load()

WHITE_MIN = 232
seen = bytearray(w * h)
queue = deque()


def near_white(x, y):
    r, g, b = px[x, y]
    return r >= WHITE_MIN and g >= WHITE_MIN and b >= WHITE_MIN


for x in range(w):
    for y in (0, h - 1):
        if near_white(x, y) and not seen[y * w + x]:
            seen[y * w + x] = 1
            queue.append((x, y))
for y in range(h):
    for x in (0, w - 1):
        if near_white(x, y) and not seen[y * w + x]:
            seen[y * w + x] = 1
            queue.append((x, y))

while queue:
    x, y = queue.popleft()
    for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
        if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and near_white(nx, ny):
            seen[ny * w + nx] = 1
            queue.append((nx, ny))

alpha = Image.new("L", (w, h), 255)
ap = alpha.load()
for y in range(h):
    row = y * w
    for x in range(w):
        if seen[row + x]:
            ap[x, y] = 0

# soften the cut edge a little so the JPEG fringe does not read as a white halo
alpha = alpha.filter(ImageFilter.GaussianBlur(0.8))
rgba = img.convert("RGBA")
rgba.putalpha(alpha)

bbox = rgba.getbbox()
rgba = rgba.crop(bbox)
cw, ch = rgba.size
pad = int(max(cw, ch) * 0.03)
canvas = Image.new("RGBA", (cw + pad * 2, ch + pad * 2), (0, 0, 0, 0))
canvas.paste(rgba, (pad, pad), rgba)

target_w = 384
if canvas.width > target_w:
    ratio = target_w / canvas.width
    canvas = canvas.resize((target_w, max(1, round(canvas.height * ratio))), Image.LANCZOS)

canvas.save(OUT_PET, "PNG", optimize=True)

icon_size = 128
side = max(canvas.size)
icon = Image.new("RGBA", (side, side), (0, 0, 0, 0))
icon.paste(canvas, ((side - canvas.width) // 2, (side - canvas.height) // 2), canvas)
icon = icon.resize((icon_size, icon_size), Image.LANCZOS)
icon.save(OUT_ICON, "PNG", optimize=True)

print("pet", canvas.size, "icon", icon.size)
