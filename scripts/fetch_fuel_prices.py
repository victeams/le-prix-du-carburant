import json
import os
from datetime import datetime, timezone
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
OUTPUT_PATH = os.path.join(DATA_DIR, "prices.json")

# API officielle du gouvernement français
API_URL = "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-carburants-fichier-instantane-v2/records?limit=1000&order_by=-horodatage"

# Mappages des noms de carburants
FUEL_ALIASES = {
    "gazole": ["gazole", "diesel", "gazole (€/litre)"],
    "sp95_e10": ["sp95-e10", "sp95", "95-e10", "sp95-e10 (€/litre)"],
    "sp98": ["sp98", "98", "sp98 (€/litre)"],
    "e85": ["e85", "éthanol", "e85 (€/litre)"],
    "gpl": ["gpl", "gpl-c", "gpl (€/litre)"],
}

# Prix par défaut si l'API échoue
DEFAULT_PRICES = {
    "gazole": 1.50,
    "sp95_e10": 1.65,
    "sp98": 1.75,
    "e85": 0.80,
    "gpl": 0.85,
}


def fetch_json(url, timeout=30):
    """Récupère JSON depuis l'API avec gestion d'erreur"""
    try:
        request = Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
        with urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError) as e:
        print(f"Erreur API: {e}")
        return None


def normalize_price(value):
    """Normalise une valeur de prix"""
    if value is None:
        return None
    try:
        # Gère les formats avec virgule ou point
        return float(str(value).replace(",", ".").strip())
    except (ValueError, AttributeError):
        return None


def fuel_key_from_label(label):
    """Convertit un label en clé de carburant"""
    if not label:
        return None
    normalized = label.lower().strip()
    for key, aliases in FUEL_ALIASES.items():
        if normalized in aliases:
            return key
    return None


def extract_prices_from_api(records):
    """Extrait les prix depuis les enregistrements API"""
    prices = {}
    
    if not records:
        return prices
    
    # Parcourt les enregistrements pour trouver les prix
    for record in records:
        # Les clés possibles dans l'API
        for fuel_field in ["carburant", "nom", "type_carburant", "fuel_type", "nom_carburant"]:
            if fuel_field in record:
                fuel_label = str(record.get(fuel_field, "")).lower()
                fuel_key = fuel_key_from_label(fuel_label)
                
                if fuel_key and fuel_key not in prices:
                    # Cherche le prix dans différents champs
                    for price_field in ["prix", "prix_litre", "prix_au_litre", "valeur", "montant"]:
                        if price_field in record:
                            price = normalize_price(record.get(price_field))
                            if price and 0.5 < price < 3.0:  # Validation basique
                                prices[fuel_key] = price
                                break
                break
    
    return prices


def main():
    """Récupère et sauvegarde les prix"""
    os.makedirs(DATA_DIR, exist_ok=True)
    
    print(f"[{datetime.now().isoformat()}] Récupération des prix depuis l'API gouvernement...")
    
    # Tentative de récupération depuis l'API
    data = fetch_json(API_URL)
    prices = {}
    
    if data:
        records = data.get("results", [])
        prices = extract_prices_from_api(records)
        print(f"Prix récupérés: {prices}")
    
    # Utilise les prix par défaut pour ceux manquants
    for key, default_price in DEFAULT_PRICES.items():
        if key not in prices or prices[key] is None:
            prices[key] = default_price
            print(f"Utilisation du prix par défaut pour {key}: {default_price}")
    
    # Structure de sortie
    payload = {
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "fuels": prices,
        "source": "data.economie.gouv.fr - Fichier instantané",
    }
    
    # Sauvegarde
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    
    print(f"✓ Fichier sauvegardé: {OUTPUT_PATH}")
    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
