const { after, before, describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createServer } = require("../server.js");

const fakeVehicle = {
  id: "test",
  brand: "Renault",
  model: "Clio V",
  year: 2023,
  fuel_type: "Petrol",
  consumption: { wltp_mixed: 5 },
  history: [{ event: "contrôle technique", date: "2024-01-01" }],
};

function listen(server) {
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${server.address().port}`)),
  );
}

function close(server) {
  return new Promise((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
}

describe("API sans fournisseur de véhicule", () => {
  let server;
  let baseUrl;
  before(async () => {
    server = createServer();
    baseUrl = await listen(server);
  });
  after(() => close(server));

  it("normalise une plaque valide", async () => {
    const response = await fetch(`${baseUrl}/plaque/ab-123-cd`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.valid, true);
    assert.equal(body.plate, "AB-123-CD");
    assert.equal(body.vehicle, null);
    assert.equal(body.history, null);
    assert.match(body.message, /fournisseur/);
  });

  it("signale une plaque invalide", async () => {
    const body = await (await fetch(`${baseUrl}/plaque/AB-12-CD`)).json();
    assert.equal(body.valid, false);
    assert.equal(body.vehicle, null);
  });

  it("liste les véhicules et calcule le coût aux 100 km", async () => {
    const list = await (await fetch(`${baseUrl}/vehicules`)).json();
    assert.ok(list.length > 0);
    const response = await fetch(`${baseUrl}/vehicules/${encodeURIComponent(list[0].id)}/cout`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.ok("cost" in body);
  });

  it("404 pour véhicule ou route inconnus, 405 hors GET", async () => {
    assert.equal((await fetch(`${baseUrl}/vehicules/nope/cout`)).status, 404);
    assert.equal((await fetch(`${baseUrl}/inconnu`)).status, 404);
    assert.equal((await fetch(`${baseUrl}/plaque/AB-123-CD`, { method: "POST" })).status, 405);
  });

  it("sert la page d'accueil", async () => {
    const response = await fetch(`${baseUrl}/`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Tester une plaque/);
  });
});

describe("API avec fournisseur de véhicule branché", () => {
  let server;
  let baseUrl;
  before(async () => {
    server = createServer({ lookupVehicleByPlate: async () => fakeVehicle });
    baseUrl = await listen(server);
  });
  after(() => close(server));

  it("renvoie véhicule, historique et coût", async () => {
    const body = await (await fetch(`${baseUrl}/plaque/AB-123-CD`)).json();
    assert.equal(body.vehicle.model, "Clio V");
    assert.equal(body.history.length, 1);
    assert.equal(body.cost.fuel, "sp95_e10");
  });
});

describe("API en erreur du fournisseur", () => {
  let server;
  let baseUrl;
  before(async () => {
    server = createServer({ lookupVehicleByPlate: async () => { throw new Error("down"); } });
    baseUrl = await listen(server);
  });
  after(() => close(server));

  it("renvoie 502", async () => {
    assert.equal((await fetch(`${baseUrl}/plaque/AB-123-CD`)).status, 502);
  });
});
