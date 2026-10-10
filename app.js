const vehicleData = {
  thermal: [
    {
      brand: "Renault",
      model: "Grand Scénic IV",
      year: 2020,
      version: "1.7 Blue dCi 120 ch",
      type: "thermal",
      consumption: 5.2,
      fuel: "diesel",
      priceKey: "gazole"
    },
    {
      brand: "Renault",
      model: "Clio V",
      year: 2023,
      version: "1.0 TCe 100 ch",
      type: "thermal",
      consumption: 4.8,
      fuel: "essence",
      priceKey: "sp95_e10"
    },
    {
      brand: "Peugeot",
      model: "308",
      year: 2023,
      version: "1.2 PureTech 130 ch",
      type: "thermal",
      consumption: 5.1,
      fuel: "essence",
      priceKey: "sp95_e10"
    },
    {
      brand: "Citroën",
      model: "C5 Aircross",
      year: 2022,
      version: "1.5 Blue HDi 130 ch",
      type: "thermal",
      consumption: 4.9,
      fuel: "diesel",
      priceKey: "gazole"
    },
    {
      brand: "Toyota",
      model: "Yaris",
      year: 2023,
      version: "1.5 Hybrid",
      type: "thermal",
      consumption: 3.4,
      fuel: "essence",
      priceKey: "sp95_e10"
    }
  ],
  electric: [
    {
      brand: "Tesla",
      model: "Model 3",
      year: 2023,
      version: "RWD 18\"",
      type: "electric",
      consumption: 14.8,
      fuel: "electric",
      priceKey: "edf_blue_base"
    },
    {
      brand: "Renault",
      model: "Zoé",
      year: 2023,
      version: "Life 17\"",
      type: "electric",
      consumption: 16.0,
      fuel: "electric",
      priceKey: "edf_blue_base"
    },
    {
      brand: "Volkswagen",
      model: "ID.3",
      year: 2023,
      version: "Pro 18\"",
      type: "electric",
      consumption: 15.5,
      fuel: "electric",
      priceKey: "edf_blue_base"
    },
    {
      brand: "Hyundai",
      model: "Kona Electric",
      year: 2023,
      version: "Standard 17\"",
      type: "electric",
      consumption: 17.0,
      fuel: "electric",
      priceKey: "edf_blue_base"
    },
    {
      brand: "BMW",
      model: "i4",
      year: 2023,
      version: "eDrive35 19\"",
      type: "electric",
      consumption: 16.8,
      fuel: "electric",
      priceKey: "edf_blue_base"
    }
  ]
};

const fallbackPrices = {
  gazole: 1.489,
  sp95_e10: 1.659,
  sp98: 1.749,
  e85: 0.769,
  gpl: 0.849
};

const electricityRates = {
  edf_blue_base: 0.2167,
  edf_blue_off_peak: 0.1637,
  edf_tempo_blue: 0.1918,
  edf_tempo_white: 0.2821,
  edf_tempo_red: 0.7526,
  public_ac: 0.35,
  public_dc: 0.59,
  custom: 0.2
};

// DOM Elements
const vehicleType = document.getElementById("vehicle-type");
const brandSelect = document.getElementById("brand");
const modelSelect = document.getElementById("model");
const yearSelect = document.getElementById("year");
const versionSelect = document.getElementById("version");
const consumptionCustom = document.getElementById("consumption-custom");
const fuelPriceSelect = document.getElementById("fuel-price");
const electricityRateSelect = document.getElementById("electricity-rate");
const customElectricityPrice = document.getElementById("custom-electricity-price");
const selectedConsumption = document.getElementById("selected-consumption");
const cost100km = document.getElementById("cost-100km");
const comparisonTable = document.getElementById("comparison-table");
const fuelUpdateBadge = document.getElementById("fuel-update-badge");
const licensePlateInput = document.getElementById("license-plate");

function formatCurrency(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function updateFuelBadge() {
  const now = new Date();
  const dateText = now.toLocaleDateString("fr-FR");
  const timeText = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  fuelUpdateBadge.textContent = `Prix des carburants mis à jour le ${dateText} à ${timeText}`;
}

function getVehicles() {
  return vehicleData[vehicleType.value] || vehicleData.thermal;
}

function populateBrandOptions() {
  const brands = [...new Set(getVehicles().map((v) => v.brand))].sort();
  brandSelect.innerHTML = "";
  brands.forEach((brand) => {
    const option = document.createElement("option");
    option.value = brand;
    option.textContent = brand;
    brandSelect.appendChild(option);
  });

  if (brandSelect.options.length) {
    brandSelect.value = brandSelect.options[0].value;
    populateModelOptions();
  }
}

function populateModelOptions() {
  const models = [...new Set(
    getVehicles()
      .filter((v) => v.brand === brandSelect.value)
      .map((v) => v.model)
  )].sort();

  modelSelect.innerHTML = "";
  models.forEach((model) => {
    const option = document.createElement("option");
    option.value = model;
    option.textContent = model;
    modelSelect.appendChild(option);
  });

  if (modelSelect.options.length) {
    modelSelect.value = modelSelect.options[0].value;
    populateYearOptions();
  }
}

function populateYearOptions() {
  const years = [...new Set(
    getVehicles()
      .filter(
        (v) => v.brand === brandSelect.value && v.model === modelSelect.value
      )
      .map((v) => v.year)
  )].sort((a, b) => b - a);

  yearSelect.innerHTML = "";
  years.forEach((year) => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  });

  if (yearSelect.options.length) {
    yearSelect.value = String(yearSelect.options[0].value);
    populateVersionOptions();
  }
}

function populateVersionOptions() {
  const versions = getVehicles().filter(
    (v) =>
      v.brand === brandSelect.value &&
      v.model === modelSelect.value &&
      Number(v.year) === Number(yearSelect.value)
  );

  versionSelect.innerHTML = "";
  versions.forEach((vehicle) => {
    const option = document.createElement("option");
    option.value = vehicle.version;
    option.textContent = vehicle.version;
    versionSelect.appendChild(option);
  });

  if (versionSelect.options.length) {
    versionSelect.value = versionSelect.options[0].value;
  }

  updateCalculation();
}

function getCurrentVehicle() {
  const vehicles = getVehicles().filter(
    (v) =>
      v.brand === brandSelect.value &&
      v.model === modelSelect.value &&
      Number(v.year) === Number(yearSelect.value)
  );

  const version = versionSelect.value;
  return vehicles.find((v) => v.version === version) || vehicles[0];
}

function getConsumptionValue() {
  const vehicle = getCurrentVehicle();
  if (!vehicle) return 0;

  const adjusted = Number(consumptionCustom.value);
  if (Number.isFinite(adjusted) && adjusted > 0) {
    return adjusted;
  }

  return Number(vehicle.consumption || 0);
}

function getElectricityRate() {
  const selected = electricityRateSelect.value;
  if (selected === "custom") {
    const value = Number(customElectricityPrice.value);
    return Number.isFinite(value) && value > 0 ? value : 0.2;
  }
  return electricityRates[selected] ?? 0.2167;
}

function calculateCost100km() {
  const vehicle = getCurrentVehicle();
  if (!vehicle) return 0;

  const consumption = getConsumptionValue();

  if (vehicleType.value === "thermal") {
    const fuelKey = fuelPriceSelect.value;
    const fuelPrice = fallbackPrices[fuelKey] ?? 1.5;
    return consumption * fuelPrice;
  }

  const electricityPrice = getElectricityRate();
  return consumption * 1.12 * electricityPrice;
}

function renderComparisonTable() {
  const vehicle = getCurrentVehicle();
  const baseConsumption = vehicle ? Number(vehicle.consumption || 0) : 0;

  const rows = [
    ["Gazole", "€/L", fallbackPrices.gazole, baseConsumption * fallbackPrices.gazole],
    ["SP95-E10", "€/L", fallbackPrices.sp95_e10, baseConsumption * fallbackPrices.sp95_e10],
    ["SP98", "€/L", fallbackPrices.sp98, baseConsumption * fallbackPrices.sp98],
    ["GPL", "€/L", fallbackPrices.gpl, baseConsumption * fallbackPrices.gpl],
    ["Recharge domicile", "€/kWh", getElectricityRate(), baseConsumption * 1.12 * getElectricityRate()],
    ["Recharge autoroute", "€/kWh", electricityRates.public_dc, baseConsumption * 1.12 * electricityRates.public_dc],
  ];

  comparisonTable.innerHTML = "";

  rows.forEach(([label, unit, price, total]) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${label}</td>
      <td>${unit === "€/L" ? formatCurrency(price) + "/L" : formatCurrency(price) + "/kWh"}</td>
      <td>${formatCurrency(total)}</td>
    `;
    comparisonTable.appendChild(row);
  });
}

function updateCalculation() {
  const vehicle = getCurrentVehicle();
  if (!vehicle) return;

  const consumption = getConsumptionValue();
  const cost = calculateCost100km();
  const unit = vehicleType.value === "thermal" ? "L/100 km" : "kWh/100 km";

  selectedConsumption.textContent = `${consumption.toFixed(1)} ${unit}`;
  cost100km.textContent = `${formatCurrency(cost)} / 100 km`;
  renderComparisonTable();
}

// Event listeners
vehicleType.addEventListener("change", () => {
  populateBrandOptions();
  updateCalculation();
});

brandSelect.addEventListener("change", populateModelOptions);
modelSelect.addEventListener("change", populateYearOptions);
yearSelect.addEventListener("change", populateVersionOptions);
versionSelect.addEventListener("change", updateCalculation);
consumptionCustom.addEventListener("input", updateCalculation);
fuelPriceSelect.addEventListener("change", updateCalculation);
electricityRateSelect.addEventListener("change", updateCalculation);
customElectricityPrice.addEventListener("input", updateCalculation);

// Initialize app
function init() {
  updateFuelBadge();
  populateBrandOptions();
  updateCalculation();
}

init();
