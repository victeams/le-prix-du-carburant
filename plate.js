function validateFrenchPlate(value) {
  const plate = String(value).trim().toUpperCase();
  return {
    valid: /^[A-HJ-NPR-TV-Z]{2}-\d{3}-[A-HJ-NPR-TV-Z]{2}$/.test(plate),
    plate,
  };
}

function extractPlateFromText(text) {
  const match = String(text).toUpperCase().match(/\b([A-Z]{2})[\s.-]?(\d{3})[\s.-]?([A-Z]{2})\b/);
  if (!match) return null;
  const candidate = `${match[1]}-${match[2]}-${match[3]}`;
  return validateFrenchPlate(candidate).valid ? candidate : null;
}

if (typeof window !== "undefined") {
  window.validateFrenchPlate = validateFrenchPlate;
  window.extractPlateFromText = extractPlateFromText;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { validateFrenchPlate, extractPlateFromText };
}
