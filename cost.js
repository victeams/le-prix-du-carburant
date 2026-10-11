function fuelKey(vehicle) {
  const fuel = String(vehicle?.fuel_type || "").toLowerCase();
  if (fuel.includes("diesel") || fuel.includes("gazole")) return "gazole";
  if (fuel.includes("gpl")) return "gpl";
  if (fuel.includes("e85") || fuel.includes("ethanol")) return "e85";
  return "sp95_e10";
}

// Coût thermique en € / 100 km ; null si prix ou consommation indisponible.
function thermalCostPer100km(vehicle, prices) {
  const key = fuelKey(vehicle);
  const price = prices?.fuels?.[key];
  const consumption = vehicle?.consumption?.wltp_mixed;
  if (!(price > 0) || !(consumption > 0)) {
    return { fuel: key, price: null, consumption: consumption || null, cost: null };
  }
  return {
    fuel: key,
    price,
    consumption,
    cost: Math.round(price * consumption * 100) / 100,
  };
}

module.exports = { fuelKey, thermalCostPer100km };
