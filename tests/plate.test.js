const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { validateFrenchPlate } = require("../plate.js");

describe("validateFrenchPlate", () => {
  it("accepts a correctly formatted French SIV plate", () => {
    assert.deepEqual(validateFrenchPlate("AB-123-CD"), { valid: true, plate: "AB-123-CD" });
  });

  it("normalizes lowercase input and surrounding whitespace", () => {
    assert.deepEqual(validateFrenchPlate("  ab-123-cd "), { valid: true, plate: "AB-123-CD" });
  });

  for (const plate of [
    "",
    "ABC-123-CD",
    "AB-12-CD",
    "AB-1234-CD",
    "AB 123 CD",
    "AB-123-CI",
    "AB-123-CO",
    "AB-123-CU",
    "AB-12A-CD",
  ]) {
    it(`rejects "${plate}"`, () => {
      assert.equal(validateFrenchPlate(plate).valid, false);
    });
  }
});
