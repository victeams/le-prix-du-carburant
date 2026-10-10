#!/usr/bin/env python3
"""Récupère les prix des carburants depuis https://www.carburants.org/ et les écrit dans data/prices.json.

En cas d'échec du scraping, le dernier cache valide (data/prices.json) est conservé,
sinon des prix par défaut sont utilisés.
"""
import json
import os
import re
import sys
from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_PATH = os.path.join(BASE_DIR, "data", "prices.json")
SOURCE_URL = "https://www.carburants.org/"
SOURCE_NAME = "carburants.org"

FUEL_ALIASES = {
    "gazole": ["gazole", "diesel"],
    "sp95_e10": ["sp95-e10", "sp95 e10", "e10", "sp95"],
    "sp98": ["sp98", "sp 98"],
    "e85": ["e85", "superéthanol", "superethanol"],
    "gpl": ["gpl", "gplc"],
}
BRANDS = ["Leclerc", "TotalEnergies", "Total", "Carrefour", "Intermarché", "Auchan",
          "Casino", "Esso", "Avia", "Shell", "BP", "Système U", "Super U", "Netto"]

DEFAULT_PRICES = {"gazole": 2.345, "sp95_e10": 2.14, "sp98": 2.235, "e85": 0.91, "gpl": 1.055}
PRICE_RE = r"(\d[.,]\d{2,3})\s*(?:€|eur)?"
MIN_PRICE, MAX_PRICE = 0.3, 4.0


def log(msg):
    print(f"[{datetime.now(timezone.utc).isoformat()}] {msg}", flush=True)


def to_price(text):
    try:
        value = float(str(text).replace(",", ".").replace("€", "").strip())
    except ValueError:
        return None
    return round(value, 3) if MIN_PRICE <= value <= MAX_PRICE else None


def fuel_key(label):
    label = label.lower().strip()
    for key, aliases in FUEL_ALIASES.items():
        if any(a == label or re.search(rf"\b{re.escape(a)}\b", label) for a in aliases):
            return key
    return None


def fetch_html(url=SOURCE_URL, timeout=30):
    response = requests.get(url, timeout=timeout, headers={"User-Agent": "Mozilla/5.0 (compatible; le-prix-du-carburant-bot)"})
    response.raise_for_status()
    return response.text


def parse_average_prices(soup):
    """Cherche pour chaque carburant le premier prix suivant son libellé."""
    text = soup.get_text(" ", strip=True)
    prices = {}
    for key, aliases in FUEL_ALIASES.items():
        for alias in aliases:
            match = re.search(rf"\b{re.escape(alias)}\b[^0-9]{{0,40}}{PRICE_RE}", text, re.IGNORECASE)
            price = to_price(match.group(1)) if match else None
            if price:
                prices[key] = price
                break
    return prices


def parse_stations(soup):
    """Lit les tableaux dont l'en-tête nomme des carburants (1 ligne = 1 station)."""
    stations = []
    for table in soup.find_all("table"):
        header = [c.get_text(" ", strip=True) for c in table.find_all("tr")[0].find_all(["th", "td"])] if table.find("tr") else []
        columns = {i: fuel_key(h) for i, h in enumerate(header) if fuel_key(h)}
        if not columns:
            continue
        for row in table.find_all("tr")[1:]:
            cells = [c.get_text(" ", strip=True) for c in row.find_all(["td", "th"])]
            if not cells or not cells[0]:
                continue
            station = {"name": cells[0]}
            for i, key in columns.items():
                if i < len(cells):
                    price = to_price(re.sub(r"[^\d.,]", "", cells[i]) or "x")
                    if price:
                        station[key] = price
            if len(station) > 1 and any(b.lower() in cells[0].lower() for b in BRANDS):
                stations.append(station)
    return stations


def parse_source_date(soup):
    text = soup.get_text(" ", strip=True)
    match = re.search(r"(\d{2})/(\d{2})/(\d{4})", text)
    if match:
        d, m, y = match.groups()
        return f"{y}-{m}-{d}"
    match = re.search(r"\d{4}-\d{2}-\d{2}", text)
    return match.group(0) if match else None


def load_cache():
    try:
        with open(OUTPUT_PATH, encoding="utf-8") as f:
            data = json.load(f)
        avg = data.get("average_prices") or data.get("fuels")
        if avg:
            return {
                "last_updated": data.get("last_updated"),
                "source_updated": data.get("source_updated") or str(data.get("last_updated", ""))[:10] or None,
                "average_prices": avg,
                "stations": data.get("stations", []),
                "source": SOURCE_NAME,
            }
    except (OSError, ValueError):
        pass
    return None


def build_payload():
    cache = load_cache()
    scraped, stations, source_date = {}, [], None
    try:
        soup = BeautifulSoup(fetch_html(), "html.parser")
        scraped = parse_average_prices(soup)
        stations = parse_stations(soup)
        source_date = parse_source_date(soup)
        log(f"Prix récupérés: {scraped}; stations: {len(stations)}")
    except Exception as exc:  # réseau, HTML inattendu...
        log(f"Échec du scraping: {exc}")

    if not scraped:
        if cache:
            log("Utilisation du cache existant")
            cache["source_updated"] = cache["source_updated"] or datetime.now(timezone.utc).strftime("%Y-%m-%d")
            return cache, False
        log("Aucun cache: utilisation des prix par défaut")

    base = (cache or {}).get("average_prices", DEFAULT_PRICES)
    average = {k: scraped.get(k, base.get(k, DEFAULT_PRICES[k])) for k in DEFAULT_PRICES}
    payload = {
        "last_updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source_updated": source_date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "average_prices": average,
        "stations": stations or (cache or {}).get("stations", []),
        "source": SOURCE_NAME,
    }
    return payload, bool(scraped)


def main():
    payload, fresh = build_payload()
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
        f.write("\n")
    log(f"Fichier écrit: {OUTPUT_PATH} (scraping {'réussi' if fresh else 'en échec, cache/défaut'})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
