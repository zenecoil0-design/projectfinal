"""Visual QA of printed digits from actual PDF page rasters (not DOM or OCR).

Usage: python tests/pdf-numbering-contact-sheet.py output.png input1.pdf ...
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps
from pypdf import PdfReader

sources = [(Path(path), PdfReader(path)) for path in sys.argv[2:]]
sheet = Image.new("RGB", (260 * len(sources), 50 + 65 * max(len(reader.pages) for _, reader in sources)), "#e4e9ec")
draw = ImageDraw.Draw(sheet)
for column, (path, reader) in enumerate(sources):
    left = column * 260
    draw.text((left + 8, 10), path.stem, fill="black")
    for index, page in enumerate(reader.pages):
        used = [operands[0] for operands, operator in page.get_contents().operations if operator == b"Do"]
        assert len(used) == 1, "Expected one painted page raster"
        raster = page.images[used[0]].image.convert("RGB")
        width, height = raster.size
        # A4 bottom-right margin contains the printed number in all templates.
        strip = raster.crop((int(width * .84), int(height * .94), int(width * .95), int(height * .995)))
        strip = ImageOps.contain(strip, (160, 58))
        top = 45 + index * 65
        draw.text((left + 8, top + 18), f"paper {index + 1}", fill="black")
        sheet.paste(strip, (left + 85, top))
sheet.save(sys.argv[1])
