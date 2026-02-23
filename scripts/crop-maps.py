"""
Crop all PNG map images to the grey map area, removing title and legend.

The grey box is detected automatically by scanning for the grey background color.

Usage: python scripts/crop-maps.py
"""

import os
from PIL import Image
import numpy as np

BASE = os.path.join(os.path.dirname(__file__), '..', 'fish')
PNG_DIR = os.path.join(BASE, 'binary_confidence_png')

# First, detect the grey box bounds from a sample image
sample = sorted(f for f in os.listdir(PNG_DIR) if f.endswith('.png'))[0]
img = np.array(Image.open(os.path.join(PNG_DIR, sample)))

# The grey background is approximately RGB(191,191,191) — detect pixels
# that are grey (R≈G≈B, between 170-210)
grey_mask = (
    (img[:, :, 0] > 170) & (img[:, :, 0] < 215) &
    (img[:, :, 1] > 170) & (img[:, :, 1] < 215) &
    (img[:, :, 2] > 170) & (img[:, :, 2] < 215) &
    (np.abs(img[:, :, 0].astype(int) - img[:, :, 1].astype(int)) < 10) &
    (np.abs(img[:, :, 1].astype(int) - img[:, :, 2].astype(int)) < 10)
)

# Find the bounding box of the grey area
rows = np.any(grey_mask, axis=1)
cols = np.any(grey_mask, axis=0)
y_min, y_max = np.where(rows)[0][[0, -1]]
x_min, x_max = np.where(cols)[0][[0, -1]]

print(f'Detected grey box: x=[{x_min}, {x_max}], y=[{y_min}, {y_max}]')
print(f'Crop size: {x_max - x_min + 1} x {y_max - y_min + 1} px')

# Now crop all images
files = sorted(f for f in os.listdir(PNG_DIR) if f.endswith('.png'))
print(f'\nCropping {len(files)} images...')

done = 0
for f in files:
    filepath = os.path.join(PNG_DIR, f)
    try:
        im = Image.open(filepath)
        cropped = im.crop((x_min, y_min, x_max + 1, y_max + 1))
        cropped.save(filepath)
        done += 1
        if done % 10 == 0 or done == len(files):
            print(f'  {done}/{len(files)}')
    except Exception as e:
        print(f'  FAILED: {f} — {e}')

print(f'Done. {done} images cropped.')
