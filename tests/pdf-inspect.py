"""Read the actual raster PDF; no OCR or application dependency is needed."""
import collections
import hashlib
import json
import sys
from pathlib import Path

from pypdf import PdfReader

path = Path(sys.argv[1])
reader = PdfReader(path)
markers = []
hashes = []
boxes = []
for page in reader.pages:
    boxes.append([float(page.mediabox.width), float(page.mediabox.height)])
    used = [operands[0] for operands, operator in page.get_contents().operations if operator == b"Do"]
    assert len(used) == 1, "Expected one painted page raster, not missing/blank output"
    image = page.images[used[0]].image.convert("RGB")
    hashes.append(hashlib.sha256(image.tobytes()).hexdigest())
    colors = collections.Counter(image.resize((200, 283)).getdata())
    scores = [sum(count for color, count in colors.items()
                  if max(abs(color[channel] - target[channel]) for channel in range(3)) < 4)
              for target in [(55 + index * 10, 150, 50) for index in range(15)]]
    markers.append(scores.index(max(scores)) if max(scores) > 80 else None)
print(json.dumps({"pages": len(reader.pages), "bytes": path.stat().st_size,
                  "boxes": boxes, "markers": markers, "uniqueRasters": len(set(hashes))}))
