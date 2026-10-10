(function () {
  "use strict";

  const PLATE_REGEX = /[A-Z]{2}-?\d{3}-?[A-Z]{2}/;
  const LOSS_COEFFICIENT = 1.12;
  const NOT_IDENTIFIED = "Véhicule non identifié automatiquement, choisissez-le manuellement";
  const FUEL_ROWS = [
    ["gazole", "Gazole"],
    ["sp95_e10", "SP95-E10"],
    ["sp98", "SP98"],
    ["e85", "E85"],
    ["gpl", "GPL"],
  ];
  const DEFAULT_PRICES = { gazole: 2.345, sp95_e10: 2.14, sp98: 2.235, e85: 0.91, gpl: 1.055 };
  const DEFAULT_RATES = {
    edf_blue_base: 0.2167,
    edf_blue_off_peak: 0.1637,
    edf_tempo_blue: 0.1918,
    edf_tempo_white: 0.2821,
    edf_tempo_red: 0.7526,
    public_ac: 0.35,
    public_dc: 0.59,
    custom: 0.2,
  };

  const $ = (id) => document.getElementById(id);
  const el = {
    type: $("vehicle-type"), brand: $("brand"), model: $("model"), year: $("year"), version: $("version"),
    fuel: $("fuel-price"), rate: $("electricity-rate"), customRate: $("custom-electricity-price"),
    custom: $("consumption-custom"), consumption: $("selected-consumption"), cost: $("cost-100km"),
    table: $("comparison-table"), badge: $("fuel-update-badge"),
    plate: $("plate-input"), plateBtn: $("plate-lookup"), photo: $("plate-photo"),
    preview: $("plate-preview"), status: $("plate-status"),
  };

  let vehicles = { thermal: [], electric: [] };
  let prices = { ...DEFAULT_PRICES };
  let rates = { ...DEFAULT_RATES };

  const eur = (v, max = 2) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: max }).format(v);

  async function getJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(url + " : HTTP " + res.status);
    return res.json();
  }

  /* ---------- Données ---------- */

  function applyPrices(data) {
    const src = data.fuels || data.average_prices || {};
    const next = { ...DEFAULT_PRICES };
    Object.keys(src).forEach((key) => {
      const raw = src[key];
      const value = Number(raw && typeof raw === "object" ? raw.price ?? raw.average ?? raw.avg : raw);
      if (Number.isFinite(value) && value > 0) next[key] = value;
    });
    prices = next;
    const date = data.last_updated ? new Date(data.last_updated) : null;
    if (date && !isNaN(date)) {
      const d = date.toLocaleDateString("fr-FR");
      const t = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      el.badge.textContent = `Prix des carburants mis à jour le ${d} à ${t}`;
    } else {
      el.badge.textContent = "Prix des carburants : date de mise à jour inconnue";
    }
  }

  function applyRates(data) {
    const r = data.electricity_rates || {};
    const next = { ...DEFAULT_RATES };
    if (r.edf_blue) {
      next.edf_blue_base = r.edf_blue.base_rate ?? next.edf_blue_base;
      next.edf_blue_off_peak = r.edf_blue.off_peak_hours ?? next.edf_blue_off_peak;
    }
    if (r.edf_tempo) {
      next.edf_tempo_blue = r.edf_tempo.blue_day?.peak ?? next.edf_tempo_blue;
      next.edf_tempo_white = r.edf_tempo.white_day?.peak ?? next.edf_tempo_white;
      next.edf_tempo_red = r.edf_tempo.red_day?.peak ?? next.edf_tempo_red;
    }
    if (r.home_charging) next.edf_blue_base = r.home_charging.rate ?? next.edf_blue_base;
    if (r.public_chargers) {
      next.public_ac = r.public_chargers.ac_standard?.rate ?? next.public_ac;
      next.public_dc = r.public_chargers.dc_fast_highway?.rate ?? next.public_dc;
    }
    rates = next;
    Array.from(el.rate.options).forEach((opt) => {
      if (opt.value !== "custom" && rates[opt.value] != null) {
        opt.textContent = opt.textContent.replace(/\([\d,]+ €\/kWh\)/, `(${String(rates[opt.value]).replace(".", ",")} €/kWh)`);
      }
    });
  }

  async function loadData() {
    const [p, v, r] = await Promise.allSettled([
      getJSON("data/prices.json"),
      getJSON("data/vehicles.json"),
      getJSON("data/electricity_rates.json"),
    ]);
    if (p.status === "fulfilled") applyPrices(p.value);
    else el.badge.textContent = "Prix des carburants : valeurs de référence (mise à jour indisponible)";
    if (v.status === "fulfilled") {
      vehicles = { thermal: v.value.thermal || [], electric: v.value.electric || [] };
    }
    if (r.status === "fulfilled") applyRates(r.value);
    if (!vehicles.thermal.length && !vehicles.electric.length) {
      setStatus("Base de véhicules indisponible.", "error");
    }
  }

  /* ---------- Listes en cascade ---------- */

  const list = () => vehicles[el.type.value] || [];

  function fill(select, values, selected) {
    select.innerHTML = "";
    values.forEach((v) => {
      const o = document.createElement("option");
      o.value = o.textContent = v;
      select.appendChild(o);
    });
    if (selected != null && values.map(String).includes(String(selected))) select.value = String(selected);
  }

  const unique = (arr) => [...new Set(arr)];
  const versionOf = (v) => v.version;

  function populate(level, sel = {}) {
    if (level <= 0) fill(el.brand, unique(list().map((v) => v.brand)).sort(), sel.brand);
    if (level <= 1) fill(el.model, unique(list().filter((v) => v.brand === el.brand.value).map((v) => v.model)).sort(), sel.model);
    if (level <= 2) {
      fill(el.year, unique(list().filter((v) => v.brand === el.brand.value && v.model === el.model.value).map((v) => v.year)).sort((a, b) => b - a), sel.year);
    }
    if (level <= 3) {
      fill(el.version, list()
        .filter((v) => v.brand === el.brand.value && v.model === el.model.value && String(v.year) === el.year.value)
        .map(versionOf), sel.version);
    }
    update();
  }

  function current() {
    return list().find((v) => v.brand === el.brand.value && v.model === el.model.value &&
      String(v.year) === el.year.value && v.version === el.version.value);
  }

  /* ---------- Calculs ---------- */

  function fuelKey(vehicle) {
    const f = (vehicle.fuel_type || "").toLowerCase();
    if (f.includes("diesel") || f.includes("gazole")) return "gazole";
    if (f.includes("gpl") || f.includes("lpg")) return "gpl";
    if (f.includes("e85") || f.includes("éthanol") || f.includes("ethanol")) return "e85";
    return "sp95_e10";
  }

  function consumption() {
    const custom = Number(String(el.custom.value).replace(",", "."));
    if (Number.isFinite(custom) && custom > 0) return custom;
    const v = current();
    return v ? Number(v.consumption) : 0;
  }

  function electricRate() {
    if (el.rate.value === "custom") {
      const c = Number(String(el.customRate.value).replace(",", "."));
      return Number.isFinite(c) && c > 0 ? c : rates.custom;
    }
    return rates[el.rate.value] ?? rates.edf_blue_base;
  }

  function update() {
    const electric = el.type.value === "electric";
    const v = current();
    const c = consumption();
    const unit = electric ? "kWh/100 km" : "L/100 km";
    if (!electric && v) el.fuel.value = fuelKey(v);
    el.fuel.disabled = electric;
    el.rate.disabled = !electric;
    el.customRate.disabled = !electric || el.rate.value !== "custom";
    const cost = electric ? c * LOSS_COEFFICIENT * electricRate() : c * (prices[el.fuel.value] ?? 0);
    el.consumption.textContent = c ? `${c.toFixed(1).replace(".", ",")} ${unit}` : `-- ${unit}`;
    el.cost.textContent = c ? `${eur(cost)} / 100 km` : "-- € / 100 km";
    renderTable(c, electric);
  }

  function renderTable(c, electric) {
    const rows = FUEL_ROWS.map(([k, label]) => [label, prices[k], "L", !electric ? c * prices[k] : null])
      .concat([
        ["Recharge domicile", rates.edf_blue_base, "kWh", electric ? c * LOSS_COEFFICIENT * rates.edf_blue_base : null],
        ["Recharge autoroute", rates.public_dc, "kWh", electric ? c * LOSS_COEFFICIENT * rates.public_dc : null],
      ]);
    el.table.innerHTML = "";
    rows.forEach(([label, price, unit, cost]) => {
      const tr = document.createElement("tr");
      [label, `${eur(price, 4)}/${unit}`, cost == null || !c ? "—" : eur(cost)].forEach((t) => {
        const td = document.createElement("td");
        td.textContent = t;
        tr.appendChild(td);
      });
      el.table.appendChild(tr);
    });
  }

  /* ---------- Plaque ---------- */

  function setStatus(msg, kind) {
    el.status.textContent = msg;
    el.status.className = "plate-status" + (kind ? " " + kind : "");
  }

  function normalizePlate(text) {
    const m = String(text || "").toUpperCase().replace(/[^A-Z0-9-]/g, "").match(PLATE_REGEX);
    if (!m) return null;
    const raw = m[0].replace(/-/g, "");
    return `${raw.slice(0, 2)}-${raw.slice(2, 5)}-${raw.slice(5)}`;
  }

  function preprocess(img) {
    const maxW = 1200;
    const scale = Math.min(3, maxW / img.naturalWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const px = data.data;
    const contrast = 1.6;
    for (let i = 0; i < px.length; i += 4) {
      const g = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      const v = Math.max(0, Math.min(255, (g - 128) * contrast + 128));
      px[i] = px[i + 1] = px[i + 2] = v;
    }
    ctx.putImageData(data, 0, 0);
    return canvas;
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => resolve({ img, url });
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image")); };
      img.src = url;
    });
  }

  async function onPhoto() {
    const file = el.photo.files && el.photo.files[0];
    if (!file) return;
    let loaded;
    try {
      loaded = await loadImage(file);
    } catch (e) {
      setStatus("Image illisible, saisissez la plaque manuellement.", "error");
      return;
    }
    el.preview.src = loaded.url;
    el.preview.hidden = false;
    if (!window.Tesseract) {
      setStatus("Lecture automatique indisponible (module OCR non chargé). Saisissez la plaque manuellement.", "error");
      return;
    }
    setStatus("Lecture de la plaque en cours…");
    try {
      const canvas = preprocess(loaded.img);
      const worker = await Tesseract.createWorker("eng");
      try {
        await worker.setParameters({
          tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-",
          tessedit_pageseg_mode: "7",
        });
        const { data } = await worker.recognize(canvas);
        const plate = normalizePlate(data.text);
        if (!plate) {
          setStatus("Plaque non lisible. Reprenez la photo (de face, bien éclairée) ou saisissez-la manuellement.", "error");
          return;
        }
        el.plate.value = plate;
        setStatus(`Plaque détectée : ${plate} (corrigez-la si besoin).`, "ok");
        await lookupPlate();
      } finally {
        await worker.terminate();
      }
    } catch (e) {
      setStatus("Lecture automatique impossible. Saisissez la plaque manuellement.", "error");
    }
  }

  function closest(brand, model, year, hint, type) {
    const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
    const pool = vehicles[type].filter((v) => norm(v.brand) === norm(brand) && norm(v.model) === norm(model));
    if (!pool.length) return null;
    const y = Number(year) || 0;
    const words = String(hint || "").toLowerCase().split(/[^a-z0-9.]+/).filter(Boolean);
    const score = (v) => {
      const ver = v.version.toLowerCase();
      return -Math.abs((Number(v.year) || 0) - y) * 10 + words.filter((w) => ver.includes(w)).length;
    };
    return pool.sort((a, b) => score(b) - score(a))[0];
  }

  async function lookupPlate() {
    const plate = normalizePlate(el.plate.value);
    if (!plate) {
      setStatus("Format d'immatriculation invalide (attendu : AB-123-CD).", "error");
      return;
    }
    el.plate.value = plate;
    const url = (window.PLATE_API_URL || "").trim();
    if (!url) { setStatus(NOT_IDENTIFIED, "error"); return; }
    el.plateBtn.disabled = true;
    try {
      const res = await fetch(url + (url.includes("?") ? "&" : "?") + "plate=" + encodeURIComponent(plate));
      if (!res.ok) throw new Error("HTTP " + res.status);
      const d = await res.json();
      const brand = d.brand || d.marque, model = d.model || d.modele;
      const year = d.year || d.annee;
      const hint = [d.version, d.engine, d.motorisation, d.fuel_type, d.energie].filter(Boolean).join(" ");
      const energy = String(d.fuel_type || d.energie || "").toLowerCase();
      const types = /electri|électri/.test(energy) ? ["electric", "thermal"] : ["thermal", "electric"];
      let found = null, type = null;
      for (const t of types) {
        found = closest(brand, model, year, hint, t);
        if (found) { type = t; break; }
      }
      if (!found) throw new Error("not found");
      el.type.value = type;
      populate(0, { brand: found.brand, model: found.model, year: found.year, version: found.version });
      setStatus(`Véhicule identifié : ${found.brand} ${found.model} ${found.year} — ${found.version}`, "ok");
    } catch (e) {
      setStatus(NOT_IDENTIFIED, "error");
    } finally {
      el.plateBtn.disabled = false;
    }
  }

  /* ---------- Initialisation ---------- */

  el.type.addEventListener("change", () => populate(0));
  el.brand.addEventListener("change", () => populate(1));
  el.model.addEventListener("change", () => populate(2));
  el.year.addEventListener("change", () => populate(3));
  el.version.addEventListener("change", update);
  el.custom.addEventListener("input", update);
  el.fuel.addEventListener("change", update);
  el.rate.addEventListener("change", update);
  el.customRate.addEventListener("input", update);
  el.photo.addEventListener("change", onPhoto);
  el.plateBtn.addEventListener("click", lookupPlate);
  el.plate.addEventListener("keydown", (e) => { if (e.key === "Enter") lookupPlate(); });

  loadData().then(() => populate(0)).catch(() => populate(0));
})();
