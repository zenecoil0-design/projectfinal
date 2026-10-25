import { test } from "node:test";
import assert from "node:assert/strict";
import { automaticTextColor, contrastInk, contrastRatio, defaultColors, hexToHsv, hsvToHex, isDefaultColors, normalizeHex, parsePortfolioColors, resolvedTextColor } from "../src/lib/editor/portfolio-colors";

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
  assert.deepEqual(defaultColors("modern"), { primary: "#153E55", secondary: "#E4D7C6", text: null });
});

test("New portfolios get independent three-role default palettes", () => {
  for (const template of ["classic", "modern", "minimal"]) {
    const defaults = defaultColors(template);
    assert.equal(defaults.text, null);
    assert.equal(resolvedTextColor(defaults, template), automaticTextColor(template));
    assert.ok(contrastRatio(resolvedTextColor(defaults, template), "#FFFFFF") >= 4.5);
    assert.ok(isDefaultColors(defaults, template));
  }
  const first = defaultColors("classic"), second = defaultColors("classic");
  first.primary = "#AA0000";
  assert.notEqual(second.primary, first.primary);
  assert.equal(isDefaultColors(first, "classic"), false);
});

test("Restoring legacy primary/secondary colors preserves them and adds automatic text", () => {
  const restored = parsePortfolioColors(JSON.stringify({ primary: "#303f9f", secondary: "#DCE8F3" }), "classic");
  assert.deepEqual(restored, { primary: "#303F9F", secondary: "#DCE8F3", text: null });
  assert.equal(resolvedTextColor(restored, "classic"), "#243449");
});

test("Custom text color survives reload; unsafe and invalid storage falls back safely", () => {
  const chosen = { primary: "#303F9F", secondary: "#DCE8F3", text: "#77513F" };
  assert.deepEqual(parsePortfolioColors(JSON.stringify(chosen), "classic"), chosen);
  assert.deepEqual(parsePortfolioColors('{"primary":"not-a-color","secondary":"#FFFFFF"}', "modern"), defaultColors("modern"));
  assert.deepEqual(parsePortfolioColors("{broken", "minimal"), defaultColors("minimal"));
  assert.equal(parsePortfolioColors('{"primary":"#303F9F","secondary":"#DCE8F3","text":"bad"}', "classic").text, null);
  assert.ok(contrastRatio("#FFFFFF", "#FFFFFF") < 4.5);
});
