#!/usr/bin/env python3
"""Valide data/prices.json avant commit."""
import json
import os
import sys

PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "prices.json")
FUELS = ["gazole", "sp95_e10", "sp98", "e85", "gpl"]


def validate(data):
    errors = []
    for key in ("last_updated", "source_updated", "average_prices", "stations", "source"):
        if key not in data:
            errors.append(f"clé manquante: {key}")
    avg = data.get("average_prices", {})
    for fuel in FUELS:
        v = avg.get(fuel)
        if not isinstance(v, (int, float)) or not 0.3 <= v <= 4.0:
            errors.append(f"prix invalide pour {fuel}: {v!r}")
    if not isinstance(data.get("stations", []), list):
        errors.append("stations doit être une liste")
    return errors


if __name__ == "__main__":
    with open(PATH, encoding="utf-8") as f:
        errs = validate(json.load(f))
    for e in errs:
        print(f"ERREUR: {e}")
    print("prices.json valide" if not errs else "prices.json invalide")
    sys.exit(1 if errs else 0)
