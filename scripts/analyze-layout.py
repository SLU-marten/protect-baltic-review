"""Analyze the map image layout to find exact grey box boundaries."""
import os
import numpy as np
from PIL import Image

BASE = os.path.join(os.path.dirname(__file__), '..', 'fish')
# Use the original PDFs to re-generate a fresh sample
PDF_DIR = os.path.join(BASE, 'binary_confidence_pdf')

# Re-render one image fresh to analyze
import fitz
pdf_path = os.path.join(PDF_DIR, 'Gadus.morhua.pdf')
doc = fitz.open(pdf_path)
page = doc[0]
pix = page.get_pixmap(matrix=fitz.Matrix(4, 4), alpha=False)
img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, 3)
doc.close()

print(f'Image size: {pix.width} x {pix.height}')

# Detect grey pixels (the map background)
def is_grey(r, g, b, tol=15):
    avg = (int(r) + int(g) + int(b)) / 3
    return 170 < avg < 215 and abs(int(r) - avg) < tol and abs(int(g) - avg) < tol and abs(int(b) - avg) < tol

# Scan columns from left to find the left edge of grey box
grey_cols = []
for x in range(pix.width):
    col = img[:, x, :]
    grey_count = sum(1 for y in range(0, pix.height, 4) if is_grey(col[y, 0], col[y, 1], col[y, 2]))
    if grey_count > pix.height // 20:  # at least 5% of column is grey
        grey_cols.append(x)

# The map box is the largest contiguous block of grey columns
# Find gaps to separate the map box from the legend color swatches
print(f'\nGrey column range: {grey_cols[0]} to {grey_cols[-1]}')

# Check for gaps in grey columns (legend is separated by white space)
gaps = []
for i in range(1, len(grey_cols)):
    if grey_cols[i] - grey_cols[i-1] > 10:
        gaps.append((grey_cols[i-1], grey_cols[i]))
        print(f'Gap found: x={grey_cols[i-1]} to x={grey_cols[i]}')

# The map box ends at the first large gap
if gaps:
    map_right = gaps[0][0]
else:
    map_right = grey_cols[-1]

map_left = grey_cols[0]

# Now find top and bottom within the map column range
grey_rows = []
for y in range(pix.height):
    row = img[y, map_left:map_right, :]
    grey_count = sum(1 for x in range(0, row.shape[0], 4) if is_grey(row[x, 0], row[x, 1], row[x, 2]))
    if grey_count > (map_right - map_left) // 20:
        grey_rows.append(y)

map_top = grey_rows[0]
map_bottom = grey_rows[-1]

print(f'\nMap box boundaries:')
print(f'  Left:   {map_left}')
print(f'  Right:  {map_right}')
print(f'  Top:    {map_top}')
print(f'  Bottom: {map_bottom}')
print(f'  Size:   {map_right - map_left + 1} x {map_bottom - map_top + 1} px')

# Sample some pixel values at key locations
print(f'\nPixel samples:')
for label, x, y in [
    ('Title area', 100, 30),
    ('Map top-left', map_left + 5, map_top + 5),
    ('Map center', (map_left + map_right) // 2, (map_top + map_bottom) // 2),
    ('Right of map', map_right + 20, (map_top + map_bottom) // 2),
    ('Legend area', pix.width - 200, (map_top + map_bottom) // 2),
]:
    if 0 <= x < pix.width and 0 <= y < pix.height:
        r, g, b = img[y, x]
        print(f'  {label} ({x},{y}): RGB({r},{g},{b})')
