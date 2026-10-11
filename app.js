const elements = {
  vehicleType: document.getElementById("vehicle-type"),
  brand: document.getElementById("brand"),
  model: document.getElementById("model"),
  year: document.getElementById("year"),
  version: document.getElementById("version"),
  fuelField: document.getElementById("fuel-field"),
  fuelPrice: document.getElementById("fuel-price"),
  consumptionCustom: document.getElementById("consumption-custom"),
  electricityFields: document.getElementById("electricity-fields"),
  electricityRate: document.getElementById("electricity-rate"),
  customElectricityField: document.getElementById("custom-electricity-field"),
  customElectricityPrice: document.getElementById("custom-electricity-price"),
  selectedConsumption: document.getElementById("selected-consumption"),
  cost100km: document.getElementById("cost-100km"),
  comparisonTable: document.getElementById("comparison-table"),
  fuelUpdateBadge: document.getElementById("fuel-update-badge"),
  dataError: document.getElementById("data-error"),
  vehicleImageInput: document.getElementById("vehicle-image-input"),
  photoTrigger: document.getElementById("photo-trigger"),
  uploadTrigger: document.getElementById("upload-trigger"),
  vehicleScanPreview: document.getElementById("vehicle-scan-preview"),
  vehicleScanStatus: document.getElementById("vehicle-scan-status"),
  vehicleScanResult: document.getElementById("vehicle-scan-result"),
  vehicleScanDetails: document.getElementById("vehicle-scan-details"),
  vehicleScanApply: document.getElementById("vehicle-scan-apply"),
  vehicleScanRetry: document.getElementById("vehicle-scan-retry"),
};

let vehicles = { thermal: [], electric: [] };
let prices = null;
let electricityRates = null;
let detectedVehicleCandidate = null;
let currentVehicleImageData = "";

function formatCurrency(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Chargement de ${path} impossible (${response.status}).`);
  return response.json();
}

function isValidPrice(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function priceLabel(key) {
  const labels = {
    gazole: "Gazole",
    sp95_e10: "SP95-E10",
    sp98: "SP98",
    e85: "E85",
    gpl: "GPL",
  };
  return labels[key] || key;
}

function updateFuelBadge() {
  const requiredFuels = ["gazole", "sp95_e10", "sp98", "e85", "gpl"];
  if (
    prices?.status !== "available" ||
    !prices.fuels ||
    !prices.last_updated ||
    requiredFuels.some((key) => !isValidPrice(prices.fuels[key]))
  ) {
    elements.fuelUpdateBadge.textContent = "Prix des carburants indisponibles — aucune actualisation vérifiée.";
    return;
  }

  const date = new Date(prices.last_updated);
  if (Number.isNaN(date.getTime())) {
    elements.fuelUpdateBadge.textContent = "Prix des carburants chargés, date de mise à jour inconnue.";
    return;
  }
  const formattedDate = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
  elements.fuelUpdateBadge.textContent = `Prix récupérés depuis ${prices.source || "la source déclarée"} — dernière donnée : ${formattedDate} (UTC).`;
}

function getFuelPrice(key) {
  const value = prices?.fuels?.[key];
  return isValidPrice(value) ? value : null;
}

function getRateEntries() {
  const rates = electricityRates?.electricity_rates;
  if (!rates) return [];
  const defaultLoss = electricityRates.loss_coefficient || rates.home_charging?.loss_coefficient || 1.12;
  const entries = [
    ["edf_blue_base", rates.edf_blue?.name ? `${rates.edf_blue.name} - Base` : "EDF Bleu - Base", rates.edf_blue?.base_rate, defaultLoss],
    ["edf_blue_off_peak", "EDF Bleu - Heures creuses", rates.edf_blue?.off_peak_hours, rates.home_charging_off_peak?.loss_coefficient || defaultLoss],
    ["edf_tempo_blue", "EDF Tempo - Jour bleu (heures pleines)", rates.edf_tempo?.blue_day?.peak, defaultLoss],
    ["edf_tempo_white", "EDF Tempo - Jour blanc (heures pleines)", rates.edf_tempo?.white_day?.peak, defaultLoss],
    ["edf_tempo_red", "EDF Tempo - Jour rouge (heures pleines)", rates.edf_tempo?.red_day?.peak, defaultLoss],
    ["public_ac", rates.public_chargers?.ac_standard?.name, rates.public_chargers?.ac_standard?.rate, rates.public_chargers?.ac_standard?.loss_coefficient || defaultLoss],
    ["public_dc", rates.public_chargers?.dc_fast_highway?.name, rates.public_chargers?.dc_fast_highway?.rate, rates.public_chargers?.dc_fast_highway?.loss_coefficient || defaultLoss],
  ];
  return entries.filter(([, , rate]) => isValidPrice(rate));
}

function populateElectricityOptions() {
  const options = getRateEntries();
  elements.electricityRate.replaceChildren();
  options.forEach(([key, label, rate]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = `${label} (${formatCurrency(rate)}/kWh)`;
    elements.electricityRate.appendChild(option);
  });
  const custom = document.createElement("option");
  custom.value = "custom";
  custom.textContent = "Tarif personnalisé";
  elements.electricityRate.appendChild(custom);
}

function getVehicles() {
  return vehicles[elements.vehicleType.value] || [];
}

function getCurrentVehicle() {
  return getVehicles().find((vehicle) => vehicle.id === elements.version.value) || null;
}

function getFuelKey(vehicle) {
  const fuel = String(vehicle?.fuel_type || "").toLowerCase();
  if (fuel.includes("diesel") || fuel.includes("gazole")) return "gazole";
  if (fuel.includes("gpl")) return "gpl";
  if (fuel.includes("e85") || fuel.includes("ethanol")) return "e85";
  return "sp95_e10";
}

function fillSelect(select, options, getValue, getLabel) {
  select.replaceChildren();
  options.forEach((item) => {
    const option = document.createElement("option");
    option.value = getValue(item);
    option.textContent = getLabel(item);
    select.appendChild(option);
  });
  select.disabled = options.length === 0;
}

function populateBrands() {
  const brands = [...new Set(getVehicles().map((vehicle) => vehicle.brand))].sort((a, b) => a.localeCompare(b, "fr"));
  fillSelect(elements.brand, brands, (brand) => brand, (brand) => brand);
  populateModels();
}

function populateModels() {
  const models = [...new Set(getVehicles().filter((vehicle) => vehicle.brand === elements.brand.value).map((vehicle) => vehicle.model))].sort((a, b) => a.localeCompare(b, "fr"));
  fillSelect(elements.model, models, (model) => model, (model) => model);
  populateYears();
}

function populateYears() {
  const years = [...new Set(getVehicles()
    .filter((vehicle) => vehicle.brand === elements.brand.value && vehicle.model === elements.model.value)
    .map((vehicle) => vehicle.year))].sort((a, b) => b - a);
  fillSelect(elements.year, years, (year) => String(year), (year) => String(year));
  populateVersions();
}

function populateVersions() {
  const matches = getVehicles().filter((vehicle) =>
    vehicle.brand === elements.brand.value &&
    vehicle.model === elements.model.value &&
    String(vehicle.year) === elements.year.value
  );
  fillSelect(elements.version, matches, (vehicle) => vehicle.id, (vehicle) => vehicle.version);
  const vehicle = getCurrentVehicle();
  if (vehicle && elements.vehicleType.value === "thermal") elements.fuelPrice.value = getFuelKey(vehicle);
  updateCalculation();
}

function getConsumption() {
  const adjusted = Number(elements.consumptionCustom.value);
  if (elements.consumptionCustom.value.trim() !== "" && Number.isFinite(adjusted) && adjusted > 0) return adjusted;
  const vehicle = getCurrentVehicle();
  return Number(vehicle?.consumption?.wltp_mixed) || 0;
}

function getSelectedRate() {
  if (elements.electricityRate.value === "custom") {
    const value = Number(elements.customElectricityPrice.value);
    return elements.customElectricityPrice.value.trim() !== "" && isValidPrice(value)
      ? { price: value, loss: 1.12 }
      : null;
  }
  const entry = getRateEntries().find(([key]) => key === elements.electricityRate.value);
  return entry ? { price: entry[2], loss: entry[3] || 1.12 } : null;
}

function calculateThermalCost(consumption, fuelKey) {
  const price = getFuelPrice(fuelKey);
  return price === null ? null : consumption * price;
}

function appendRow(label, priceText, cost) {
  const row = document.createElement("tr");
  [label, priceText, cost === null ? "Indisponible" : formatCurrency(cost)].forEach((text) => {
    const cell = document.createElement("td");
    cell.textContent = text;
    row.appendChild(cell);
  });
  elements.comparisonTable.appendChild(row);
}

function renderComparison(vehicle, consumption) {
  elements.comparisonTable.replaceChildren();
  if (!vehicle) return;
  if (elements.vehicleType.value === "thermal") {
    ["gazole", "sp95_e10", "sp98", "e85", "gpl"].forEach((key) => {
      const price = getFuelPrice(key);
      appendRow(priceLabel(key), price === null ? "Indisponible" : `${formatCurrency(price)}/L`, calculateThermalCost(consumption, key));
    });
    return;
  }

  getRateEntries().forEach(([key, label, price, loss]) => {
    appendRow(label, `${formatCurrency(price)}/kWh`, consumption * (loss || 1.12) * price);
  });
}

function updateCalculation() {
  const electric = elements.vehicleType.value === "electric";
  elements.fuelField.hidden = electric;
  elements.electricityFields.hidden = !electric;
  elements.customElectricityField.hidden = !electric || elements.electricityRate.value !== "custom";

  const vehicle = getCurrentVehicle();
  const consumption = getConsumption();
  const unit = electric ? "kWh/100 km" : "L/100 km";
  elements.selectedConsumption.textContent = vehicle ? `${consumption.toFixed(1)} ${unit}` : "Véhicule indisponible";

  let cost = null;
  if (vehicle && consumption > 0) {
    if (electric) {
      const rate = getSelectedRate();
      if (rate) cost = consumption * rate.loss * rate.price;
    } else {
      cost = calculateThermalCost(consumption, elements.fuelPrice.value);
    }
  }
  elements.cost100km.textContent = cost === null ? "Prix indisponible" : `${formatCurrency(cost)} / 100 km`;
  renderComparison(vehicle, consumption);
}

function normalizeVehicleData(data) {
  if (!data?.vehicles || !Array.isArray(data.vehicles.thermal) || !Array.isArray(data.vehicles.electric)) {
    throw new Error("Le fichier des véhicules n'a pas le format attendu.");
  }
  return {
    thermal: data.vehicles.thermal.map((vehicle) => ({
      ...vehicle,
      version: `${vehicle.engine || "Version"} ${vehicle.power_hp ? `${vehicle.power_hp} ch` : ""}`.trim(),
    })),
    electric: data.vehicles.electric.map((vehicle) => ({
      ...vehicle,
      version: `${vehicle.trim || "Version"}${vehicle.wheel_size_inches ? ` ${vehicle.wheel_size_inches}"` : ""}`,
    })),
  };
}

function applyVehicleCandidate(candidate) {
  if (!candidate) return;
  const type = candidate.type === "electric" ? "electric" : "thermal";
  elements.vehicleType.value = type;
  populateBrands();

  const matches = getVehicles().filter((vehicle) => vehicle.brand === candidate.brand);
  if (!matches.length) return;

  const brandMatches = [...new Set(matches.map((vehicle) => vehicle.brand))];
  if (brandMatches.length) {
    elements.brand.value = candidate.brand;
    populateModels();
  }

  const modelMatches = getVehicles().filter(
    (vehicle) => vehicle.brand === candidate.brand && vehicle.model === candidate.model
  );
  if (modelMatches.length) {
    elements.model.value = candidate.model;
    populateYears();
  }

  const yearMatches = getVehicles().filter(
    (vehicle) => vehicle.brand === candidate.brand && vehicle.model === candidate.model && String(vehicle.year) === String(candidate.year)
  );
  if (yearMatches.length) {
    elements.year.value = String(candidate.year);
    populateVersions();
  }

  const targetVehicle = getVehicles().find((vehicle) => {
    const brandMatchesValue = vehicle.brand === candidate.brand;
    const modelMatchesValue = vehicle.model === candidate.model;
    const yearMatchesValue = String(vehicle.year) === String(candidate.year);
    const versionMatchesValue = candidate.version ? vehicle.version === candidate.version : true;
    return brandMatchesValue && modelMatchesValue && yearMatchesValue && versionMatchesValue;
  });

  if (targetVehicle) {
    elements.version.value = targetVehicle.id;
    if (elements.vehicleType.value === "thermal") {
      elements.fuelPrice.value = getFuelKey(targetVehicle);
    }
    updateCalculation();
  }
}

function setVehicleScanResult(candidate) {
  if (!candidate) {
    elements.vehicleScanResult.hidden = true;
    elements.vehicleScanStatus.textContent = "Aucune suggestion disponible. Vous pouvez choisir manuellement.";
    return;
  }

  detectedVehicleCandidate = candidate;
  elements.vehicleScanDetails.innerHTML = `
    <div><strong>Type :</strong> ${candidate.type === "electric" ? "Électrique" : "Thermique"}</div>
    <div><strong>Marque :</strong> ${candidate.brand}</div>
    <div><strong>Modèle :</strong> ${candidate.model}</div>
    <div><strong>Année :</strong> ${candidate.year}</div>
    <div><strong>Confiance :</strong> ${candidate.confidence}%</div>
  `;
  elements.vehicleScanResult.hidden = false;
}

async function analyzeVehicleImage(file) {
  if (!file) {
    throw new Error("Aucun fichier sélectionné.");
  }

  const data = new FormData();
  data.append("image", file);
  const response = await fetch("http://localhost:3001/api/analyze-vehicle", {
    method: "POST",
    body: data,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.candidate) {
    throw new Error(payload?.error || "L’analyse du véhicule a échoué.");
  }
  return payload.candidate;
}

function handleFileSelection(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    currentVehicleImageData = reader.result;
    elements.vehicleScanPreview.src = reader.result;
    elements.vehicleScanPreview.hidden = false;
    elements.vehicleScanStatus.textContent = "Image chargée. Analyse du véhicule en cours…";
  };
  reader.readAsDataURL(file);

  analyzeVehicleImage(file)
    .then((candidate) => {
      elements.vehicleScanStatus.textContent = `Analyse réussie — proposition ${candidate.confidence}% de confiance.`;
      setVehicleScanResult(candidate);
    })
    .catch((error) => {
      elements.vehicleScanStatus.textContent = error.message || "Impossible d’analyser cette image.";
      elements.vehicleScanResult.hidden = true;
    });
}

async function init() {
  try {
    const [vehicleData, priceData, rateData] = await Promise.all([
      loadJson("data/vehicles.json"),
      loadJson("data/prices.json"),
      loadJson("data/electricity_rates.json"),
    ]);
    vehicles = normalizeVehicleData(vehicleData);
    prices = priceData;
    electricityRates = rateData;
    populateElectricityOptions();
    updateFuelBadge();
    populateBrands();
    elements.vehicleType.addEventListener("change", populateBrands);
    elements.brand.addEventListener("change", populateModels);
    elements.model.addEventListener("change", populateYears);
    elements.year.addEventListener("change", populateVersions);
    elements.version.addEventListener("change", updateCalculation);
    elements.consumptionCustom.addEventListener("input", updateCalculation);
    elements.fuelPrice.addEventListener("change", updateCalculation);
    elements.electricityRate.addEventListener("change", updateCalculation);
    elements.customElectricityPrice.addEventListener("input", updateCalculation);
    elements.photoTrigger.addEventListener("click", () => {
      elements.vehicleImageInput.setAttribute("capture", "environment");
      elements.vehicleImageInput.click();
    });
    elements.uploadTrigger.addEventListener("click", () => {
      elements.vehicleImageInput.removeAttribute("capture");
      elements.vehicleImageInput.click();
    });
    elements.vehicleImageInput.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      handleFileSelection(file);
    });
    elements.vehicleScanApply.addEventListener("click", () => {
      if (!detectedVehicleCandidate) return;
      elements.vehicleScanStatus.textContent = "Véhicule validé. Remplissage des filtres…";
      applyVehicleCandidate(detectedVehicleCandidate);
      elements.vehicleScanResult.hidden = true;
    });
    elements.vehicleScanRetry.addEventListener("click", () => {
      elements.vehicleImageInput.value = "";
      elements.vehicleScanResult.hidden = true;
      elements.vehicleScanStatus.textContent = "Choisissez une autre image ou prenez une photo.";
    });
  } catch (error) {
    elements.fuelUpdateBadge.textContent = "Données non chargées — aucune actualisation affichée.";
    elements.dataError.textContent = `${error.message} Lancez le site depuis un serveur HTTP local ou vérifiez les fichiers de données.`;
    elements.dataError.hidden = false;
    elements.selectedConsumption.textContent = "Données indisponibles";
    elements.cost100km.textContent = "Calcul impossible";
  }
}

init();
