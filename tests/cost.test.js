const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { thermalCostPer100km } = require("../cost.js");
const { extractPlateFromText } = require("../plate.js");

describe("thermalCostPer100km", () => {
  const prices = { fuels: { gazole: 1.8, sp95_e10: 1.9 } };

  it("calcule consommation x prix", () => {
    const result = thermalCostPer100km({ fuel_type: "Diesel", consumption: { wltp_mixed: 5 } }, prices);
    assert.deepEqual(result, { fuel: "gazole", price: 1.8, consumption: 5, cost: 9 });
  });

  it("renvoie null sans prix disponible", () => {
    const result = thermalCostPer100km({ fuel_type: "Petrol", consumption: { wltp_mixed: 5 } }, { fuels: { sp95_e10: null } });
    assert.equal(result.cost, null);
  });
});

describe("extractPlateFromText", () => {
  it("retrouve une plaque dans un texte OCR bruité", () => {
    assert.equal(extractPlateFromText("F AB 123 CD F"), "AB-123-CD");
    assert.equal(extractPlateFromText("ab123cd"), "AB-123-CD");
  });

  it("ignore les textes sans plaque valide", () => {
    assert.equal(extractPlateFromText("hello world"), null);
    assert.equal(extractPlateFromText("AI-123-CD"), null);
  });
});
