import json
import os
import re
import statistics
import sys
import tempfile
import unicodedata
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
OUTPUT_PATH = os.path.join(DATA_DIR, "prices.json")
API_URL = (
    "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/"
    "prix-carburants-fichier-instantane-v2/records?limit=10000"
)

FUEL_ALIASES = {
    "gazole": {"gazole", "diesel"},
    "sp95_e10": {"sp95e10", "sp95", "95e10"},
    "sp98": {"sp98", "98"},
    "e85": {"e85", "ethanol", "superethanol"},
    "gpl": {"gpl", "gplc"},
}
PRICE_FIELDS = ("valeur", "prix", "montant", "prixlitre", "prixaulitre")
DATE_FIELDS = ("maj", "datemaj", "miseajour", "horodatage", "date", "lastupdated")


def normalize(value):
    decomposed = unicodedata.normalize("NFKD", str(value).lower())
    without_accents = "".join(char for char in decomposed if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]", "", without_accents)


def parse_price(value):
    if value is None or isinstance(value, bool):
        return None
    try:
        price = float(str(value).replace(",", ".").strip())
    except (TypeError, ValueError):
        return None
    return price if 0.5 < price < 3.0 else None


def parse_date(value):
    if value is None:
        return None
    if isinstance(value, (int, float)) and value > 0:
        try:
            return datetime.fromtimestamp(value, timezone.utc)
        except (OverflowError, OSError, ValueError):
            return None
    text = str(value).strip()
    if not text:
        return None
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).astimezone(timezone.utc)
    except ValueError:
        for date_format in ("%d/%m/%Y %H:%M:%S", "%d/%m/%Y %H:%M", "%d/%m/%Y", "%Y-%m-%d"):
            try:
                return datetime.strptime(text, date_format).replace(tzinfo=timezone.utc)
            except ValueError:
                continue
    return None


def fuel_key(label):
    normalized = normalize(label)
    for key, aliases in FUEL_ALIASES.items():
        if normalized in aliases:
            return key
    return None


def field_value(record, suffixes):
    for key, value in record.items():
        if normalize(key) in suffixes and value not in (None, ""):
            return value
    return None


def observations_from_record(record, inherited_date=None):
    observations = []
    if isinstance(record, list):
        for item in record:
            observations.extend(observations_from_record(item, inherited_date))
        return observations
    if not isinstance(record, dict):
        return observations

    record_date = field_value(record, set(DATE_FIELDS)) or inherited_date
    normalized_fields = {normalize(key): value for key, value in record.items()}

    # The Open Data API can return one fuel observation per nested object.
    label = field_value(record, {"carburant", "nom", "typecarburant", "fueltype", "nomcarburant"})
    key = fuel_key(label) if label is not None else None
    if key:
        amount = field_value(record, set(PRICE_FIELDS))
        date = record_date
        if amount is not None:
            price = parse_price(amount)
            updated = parse_date(date)
            if price is not None and updated is not None:
                observations.append((key, price, updated))

    # Other API responses expose numbered fields such as prix_1_nom and prix_1_valeur.
    for field, fuel_label in normalized_fields.items():
        if not field.endswith("nom"):
            continue
        key = fuel_key(fuel_label)
        if key is None:
            continue
        prefix = field[:-3]
        amount = next(
            (value for name, value in normalized_fields.items()
             if name.startswith(prefix) and name[len(prefix):] in set(PRICE_FIELDS)),
            None,
        )
        date = next(
            (value for name, value in normalized_fields.items()
             if name.startswith(prefix) and name[len(prefix):] in set(DATE_FIELDS)),
            record_date,
        )
        price = parse_price(amount)
        updated = parse_date(date)
        if price is not None and updated is not None:
            observations.append((key, price, updated))

    for key_name, value in record.items():
        if isinstance(value, (dict, list)):
            observations.extend(observations_from_record(value, record_date))
    return observations


def extract_prices_from_api(records):
    samples = {key: [] for key in FUEL_ALIASES}
    for record in records:
        for key, price, updated in observations_from_record(record):
            samples[key].append((price, updated))

    missing = [key for key, observations in samples.items() if not observations]
    if missing:
        raise ValueError(f"Prix vérifiés manquants pour : {', '.join(missing)}")

    prices = {key: round(statistics.median(price for price, _ in values), 3)
              for key, values in samples.items()}
    latest_source_update = max(updated for values in samples.values() for _, updated in values)
    return prices, latest_source_update


def fetch_json(url=API_URL, timeout=45):
    request = Request(url, headers={"User-Agent": "le-prix-du-carburant/1.0"})
    with urlopen(request, timeout=timeout) as response:
        if response.status != 200:
            raise RuntimeError(f"L'API a répondu avec le statut HTTP {response.status}.")
        return json.loads(response.read().decode("utf-8"))


def validate_payload(payload):
    if not isinstance(payload, dict) or not isinstance(payload.get("results"), list):
        raise ValueError("Réponse inattendue de l'API : le tableau results est absent.")
    prices, source_updated = extract_prices_from_api(payload["results"])
    return {
        "last_updated": source_updated.isoformat(timespec="seconds").replace("+00:00", "Z"),
        "fuels": prices,
        "source": "data.economie.gouv.fr — prix médians des observations disponibles",
    }


def save_prices(payload):
    os.makedirs(DATA_DIR, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=DATA_DIR, delete=False) as output:
        temp_path = output.name
        json.dump(payload, output, ensure_ascii=False, indent=2)
        output.write("\n")
    os.replace(temp_path, OUTPUT_PATH)


def main():
    try:
        payload = validate_payload(fetch_json())
        save_prices(payload)
    except (HTTPError, URLError, TimeoutError, OSError, UnicodeDecodeError,
            json.JSONDecodeError, ValueError, RuntimeError) as error:
        print(f"Échec de l'actualisation des prix : {error}", file=sys.stderr)
        return 1
    print(f"Prix validés enregistrés dans {OUTPUT_PATH}.")
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
