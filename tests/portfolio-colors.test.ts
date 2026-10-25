import { test } from "node:test";
import assert from "node:assert/strict";
import { contrastInk, defaultColors, hexToHsv, hsvToHex, normalizeHex } from "../src/lib/editor/portfolio-colors";

test("HEX input validation and normalized output", () => {
  assert.equal(normalizeHex("303f9f"), "#303F9F");
  assert.equal(normalizeHex(" #abcdef "), "#ABCDEF");
  for (const invalid of ["red", "#12", "#12345g", "12345678"]) assert.equal(normalizeHex(invalid), null);
});
test("HSV color picker round-trips primary colors", () => {
  for (const hex of ["#FF0000", "#00FF00", "#0000FF", "#303F9F", "#000000", "#FFFFFF", "#E4D7C6"]) {
    assert.equal(hsvToHex(hexToHsv(hex)), hex);
  }
});
test("Contrast color is legible on very light and dark backgrounds", () => {
  assert.equal(contrastInk("#FFFFFF"), "#172B3B");
  assert.equal(contrastInk("#000000"), "#FFFFFF");
  assert.deepEqual(defaultColors("modern"), { primary: "#153E55", secondary: "#E4D7C6" });
});
