/**
 * Convert all PDF files in fish/binary_confidence_pdf/ to high-resolution PNGs
 * in fish/binary_confidence_png/
 *
 * Usage: node scripts/pdf-to-png.mjs
 */

import fs from 'fs';
import path from 'path';
import { createCanvas } from 'canvas';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const BASE = path.resolve('fish');
const PDF_DIR = path.join(BASE, 'binary_confidence_pdf');
const PNG_DIR = path.join(BASE, 'binary_confidence_png');
const SCALE = 4; // 4x native resolution for crisp zoom

// Node canvas factory for pdfjs-dist
class NodeCanvasFactory {
  create(width, height) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');
    return { canvas, context };
  }
  reset(canvasAndContext, width, height) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }
  destroy(canvasAndContext) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

const canvasFactory = new NodeCanvasFactory();

if (!fs.existsSync(PNG_DIR)) fs.mkdirSync(PNG_DIR, { recursive: true });

const files = fs.readdirSync(PDF_DIR).filter((f) => f.endsWith('.pdf'));
console.log(`Converting ${files.length} PDFs at ${SCALE}x scale...`);

let done = 0;
for (const file of files) {
  const pdfPath = path.join(PDF_DIR, file);
  const pngName = file.replace(/\.pdf$/i, '.png');
  const pngPath = path.join(PNG_DIR, pngName);

  try {
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true, canvasFactory }).promise;
    const page = await doc.getPage(1);

    const viewport = page.getViewport({ scale: SCALE });
    const { canvas, context } = canvasFactory.create(
      Math.round(viewport.width),
      Math.round(viewport.height),
    );

    await page.render({ canvasContext: context, viewport }).promise;

    const pngBuffer = canvas.toBuffer('image/png');
    fs.writeFileSync(pngPath, pngBuffer);

    canvasFactory.destroy({ canvas, context });
    await doc.destroy();
    done++;
    if (done % 10 === 0 || done === files.length) {
      console.log(`  ${done}/${files.length}`);
    }
  } catch (err) {
    console.error(`  FAILED: ${file} — ${err.message}`);
  }
}

console.log(`Done. ${done} PNGs saved to ${PNG_DIR}`);
