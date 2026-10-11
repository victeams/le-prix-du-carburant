const fs = require("node:fs");
const path = require("node:path");

// Point d'extension : à remplacer par un fournisseur agréé (ex. HistoVec ou API payante)
// qui renvoie { id, brand, model, year, fuel_type, consumption, history } pour une plaque.
// Retourne null tant qu'aucun fournisseur n'est branché : aucune donnée n'est inventée.
async function lookupVehicleByPlate(plate) {
  return null;
}

function loadVehicles() {
  const file = path.join(__dirname, "data", "vehicles.json");
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  return [...data.vehicles.thermal, ...data.vehicles.electric];
}

module.exports = { lookupVehicleByPlate, loadVehicles };
