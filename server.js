const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { validateFrenchPlate } = require("./plate.js");
const { thermalCostPer100km } = require("./cost.js");
const vehicleLookup = require("./vehicle-lookup.js");

const ROOT = __dirname;
const STATIC_FILES = {
  "/": "index.html",
  "/index.html": "index.html",
  "/app.js": "app.js",
  "/plate.js": "plate.js",
  "/style.css": "style.css",
  "/data/vehicles.json": "data/vehicles.json",
  "/data/prices.json": "data/prices.json",
  "/data/electricity_rates.json": "data/electricity_rates.json",
};
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function sendJson(response, status, body, headers = {}) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...headers,
  });
  response.end(JSON.stringify(body));
}

function readPrices() {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, "data", "prices.json"), "utf8"));
  } catch {
    return null;
  }
}

function buildCost(vehicle) {
  if (!vehicle) return null;
  if (String(vehicle.fuel_type || "").toLowerCase().includes("electric")) return null;
  return thermalCostPer100km(vehicle, readPrices());
}

function createServer(options = {}) {
  const lookup = options.lookupVehicleByPlate || vehicleLookup.lookupVehicleByPlate;
  const loadVehicles = options.loadVehicles || vehicleLookup.loadVehicles;

  return http.createServer(async (request, response) => {
    if (request.method !== "GET") {
      sendJson(response, 405, { error: "Méthode non autorisée." }, { Allow: "GET" });
      return;
    }

    let pathname;
    try {
      pathname = new URL(request.url, "http://localhost").pathname;
    } catch {
      sendJson(response, 400, { error: "URL invalide." });
      return;
    }

    if (Object.hasOwn(STATIC_FILES, pathname)) {
      const file = STATIC_FILES[pathname];
      fs.readFile(path.join(ROOT, file), (error, content) => {
        if (error) {
          sendJson(response, 404, { error: "Fichier introuvable." });
          return;
        }
        response.writeHead(200, { "Content-Type": MIME[path.extname(file)] });
        response.end(content);
      });
      return;
    }

    const plateMatch = pathname.match(/^\/plaque\/([^/]+)$/);
    if (plateMatch) {
      let raw;
      try {
        raw = decodeURIComponent(plateMatch[1]);
      } catch {
        sendJson(response, 400, { error: "Plaque encodée invalide." });
        return;
      }
      const result = validateFrenchPlate(raw);
      if (!result.valid) {
        sendJson(response, 200, { ...result, vehicle: null, history: null, cost: null });
        return;
      }
      let vehicle = null;
      try {
        vehicle = await lookup(result.plate);
      } catch {
        sendJson(response, 502, { error: "Service de recherche de véhicule indisponible." });
        return;
      }
      const { history = null, ...vehicleData } = vehicle || {};
      sendJson(response, 200, {
        ...result,
        vehicle: vehicle ? vehicleData : null,
        history,
        cost: buildCost(vehicle),
        message: vehicle
          ? undefined
          : "Aucun fournisseur d'historique n'est branché : choisissez le véhicule manuellement.",
      });
      return;
    }

    if (pathname === "/vehicules") {
      sendJson(response, 200, loadVehicles().map(({ id, brand, model, year, fuel_type }) => ({ id, brand, model, year, fuel_type })));
      return;
    }

    const costMatch = pathname.match(/^\/vehicules\/([^/]+)\/cout$/);
    if (costMatch) {
      let id;
      try {
        id = decodeURIComponent(costMatch[1]);
      } catch {
        sendJson(response, 400, { error: "Identifiant invalide." });
        return;
      }
      const vehicle = loadVehicles().find((item) => item.id === id);
      if (!vehicle) {
        sendJson(response, 404, { error: "Véhicule introuvable." });
        return;
      }
      sendJson(response, 200, { vehicle, cost: buildCost(vehicle), prices_updated: readPrices()?.last_updated ?? null });
      return;
    }

    sendJson(response, 404, { error: "Route introuvable." });
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, "0.0.0.0", () => {
    console.log(`Site et API prêts sur http://localhost:${port} (réseau local : http://<IP-du-PC>:${port})`);
  });
}

module.exports = { createServer };
