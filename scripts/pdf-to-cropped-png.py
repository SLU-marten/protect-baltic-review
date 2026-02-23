"""
Re-convert PDFs to PNGs, cropping to the grey map box only.
Map box at 4x scale: x=[73, 2084], y=[93, 2558]

Usage: python scripts/pdf-to-cropped-png.py
"""

import os
import io
import fitz  # PyMuPDF
from PIL import Image

BASE = os.path.join(os.path.dirname(__file__), '..', 'fish')
PDF_DIR = os.path.join(BASE, 'binary_confidence_pdf')
PNG_DIR = os.path.join(BASE, 'binary_confidence_png')
SCALE = 6

# Crop box — originally measured at 4x, scaled proportionally
SF = SCALE / 4
CROP_BOX = (round(73 * SF), round(93 * SF), round(2085 * SF), round(2559 * SF))

os.makedirs(PNG_DIR, exist_ok=True)

files = sorted(f for f in os.listdir(PDF_DIR) if f.lower().endswith('.pdf'))
print(f'Converting and cropping {len(files)} PDFs...')

done = 0
for f in files:
    pdf_path = os.path.join(PDF_DIR, f)
    png_name = f.rsplit('.', 1)[0] + '.png'
    png_path = os.path.join(PNG_DIR, png_name)

    try:
        doc = fitz.open(pdf_path)
        page = doc[0]
        pix = page.get_pixmap(matrix=fitz.Matrix(SCALE, SCALE), alpha=False)

        # Convert to PIL Image for cropping
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        cropped = img.crop(CROP_BOX)
        cropped.save(png_path)

        doc.close()
        done += 1
        if done % 10 == 0 or done == len(files):
            print(f'  {done}/{len(files)}')
    except Exception as e:
        print(f'  FAILED: {f} — {e}')

print(f'Done. {done} cropped PNGs saved to {PNG_DIR}')
