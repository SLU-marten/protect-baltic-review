"""Better analysis: find the grey box by scanning its top edge."""
import os
import numpy as np
from PIL import Image
import fitz

BASE = os.path.join(os.path.dirname(__file__), '..', 'fish')
PDF_DIR = os.path.join(BASE, 'binary_confidence_pdf')

pdf_path = os.path.join(PDF_DIR, 'Gadus.morhua.pdf')
doc = fitz.open(pdf_path)
page = doc[0]
pix = page.get_pixmap(matrix=fitz.Matrix(4, 4), alpha=False)
img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, 3)
doc.close()

print(f'Image size: {pix.width} x {pix.height}')

# The grey color is RGB(204, 204, 204) based on pixel samples
GREY = np.array([204, 204, 204])

# Create a mask for grey pixels (tolerance of 5)
grey_mask = np.all(np.abs(img.astype(int) - GREY) < 5, axis=2)

# Find rows with grey pixels
row_grey_count = grey_mask.sum(axis=1)
# The map box rows have a significant number of grey pixels
# Find the first and last rows with substantial grey
threshold = 100  # at least 100 grey pixels in the row
map_rows = np.where(row_grey_count > threshold)[0]
map_top = map_rows[0]
map_bottom = map_rows[-1]

print(f'Map row range: {map_top} to {map_bottom}')

# Now scan the top few rows of the map to find the full width
# The very top row of the grey box should be entirely grey from left to right
top_row = grey_mask[map_top]
grey_indices = np.where(top_row)[0]
print(f'Top row grey pixels: {grey_indices[0]} to {grey_indices[-1]}')

# Also check a row near the top but a bit inside (row map_top + 10)
row_inner = grey_mask[map_top + 20]
grey_inner = np.where(row_inner)[0]
print(f'Row +20 grey pixels: {grey_inner[0]} to {grey_inner[-1]}')

# The right edge of the map box: find the rightmost continuous grey block in the top rows
# Look at the top 50 rows and find the max consistent right edge
right_edges = []
for y in range(map_top, map_top + 50):
    row = grey_mask[y]
    indices = np.where(row)[0]
    if len(indices) > 0:
        right_edges.append(indices[-1])

map_left = grey_indices[0]
map_right = int(np.median(right_edges))

print(f'\nMap box boundaries:')
print(f'  Left:   {map_left}')
print(f'  Right:  {map_right}')
print(f'  Top:    {map_top}')
print(f'  Bottom: {map_bottom}')
print(f'  Size:   {map_right - map_left + 1} x {map_bottom - map_top + 1} px')

# Verify: check what's to the right of the map box
for dx in [0, 10, 50, 100]:
    x = map_right + dx
    if x < pix.width:
        r, g, b = img[map_top + 100, x]
        print(f'  At x={x} (right+{dx}): RGB({r},{g},{b})')
