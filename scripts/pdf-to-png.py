"""
Convert all PDF files in fish/binary_confidence_pdf/ to high-resolution PNGs.

Usage: python scripts/pdf-to-png.py
"""

import os
import fitz  # PyMuPDF

BASE = os.path.join(os.path.dirname(__file__), '..', 'fish')
PDF_DIR = os.path.join(BASE, 'binary_confidence_pdf')
PNG_DIR = os.path.join(BASE, 'binary_confidence_png')
SCALE = 4  # 4x native resolution

os.makedirs(PNG_DIR, exist_ok=True)

files = sorted(f for f in os.listdir(PDF_DIR) if f.lower().endswith('.pdf'))
print(f'Converting {len(files)} PDFs at {SCALE}x scale...')

done = 0
for f in files:
    pdf_path = os.path.join(PDF_DIR, f)
    png_path = os.path.join(PNG_DIR, f.rsplit('.', 1)[0] + '.png')

    try:
        doc = fitz.open(pdf_path)
        page = doc[0]
        mat = fitz.Matrix(SCALE, SCALE)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        pix.save(png_path)
        doc.close()
        done += 1
        if done % 10 == 0 or done == len(files):
            print(f'  {done}/{len(files)}')
    except Exception as e:
        print(f'  FAILED: {f} — {e}')

print(f'Done. {done} PNGs saved to {PNG_DIR}')
