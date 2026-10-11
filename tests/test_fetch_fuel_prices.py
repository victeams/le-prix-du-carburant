import contextlib
import io
import json
import os
import tempfile
import unittest
from datetime import datetime, timezone
from unittest.mock import patch

from scripts import fetch_fuel_prices


class FuelPriceTests(unittest.TestCase):
    def test_uses_current_dataset_and_extracts_its_fuel_fields(self):
        self.assertIn(
            "prix-des-carburants-en-france-flux-instantane-v2",
            fetch_fuel_prices.API_URL,
        )
        record = {
            "gazole_prix": "1.60",
            "gazole_maj": "2026-10-10T10:00:00Z",
            "e10_prix": "1.70",
            "e10_maj": "2026-10-10T11:00:00Z",
            "sp98_prix": "1.80",
            "sp98_maj": "2026-10-10T12:00:00Z",
            "e85_prix": "0.80",
            "e85_maj": "2026-10-10T13:00:00Z",
            "gplc_prix": "0.90",
            "gplc_maj": "2026-10-10T14:00:00Z",
        }

        prices, updated = fetch_fuel_prices.extract_prices_from_api([record])

        self.assertEqual(prices, {
            "gazole": 1.6,
            "sp95_e10": 1.7,
            "sp98": 1.8,
            "e85": 0.8,
            "gpl": 0.9,
        })
        self.assertEqual(updated, datetime(2026, 10, 10, 14, tzinfo=timezone.utc))

    def test_extracts_medians_from_numbered_price_fields(self):
        record = {
            "prix_1_nom": "Gazole",
            "prix_1_valeur": "1,60",
            "prix_1_maj": "2026-10-10T10:00:00Z",
            "prix_2_nom": "SP95-E10",
            "prix_2_valeur": "1.70",
            "prix_2_maj": "2026-10-10T11:00:00Z",
            "prix_3_nom": "SP98",
            "prix_3_valeur": "1.80",
            "prix_3_maj": "2026-10-10T12:00:00Z",
            "prix_4_nom": "E85",
            "prix_4_valeur": "0.80",
            "prix_4_maj": "2026-10-10T13:00:00Z",
            "prix_5_nom": "GPL",
            "prix_5_valeur": "0.90",
            "prix_5_maj": "2026-10-10T14:00:00Z",
        }

        prices, updated = fetch_fuel_prices.extract_prices_from_api([record])

        self.assertEqual(prices, {
            "gazole": 1.6,
            "sp95_e10": 1.7,
            "sp98": 1.8,
            "e85": 0.8,
            "gpl": 0.9,
        })
        self.assertEqual(updated, datetime(2026, 10, 10, 14, tzinfo=timezone.utc))

    def test_rejects_incomplete_or_undated_observations(self):
        with self.assertRaisesRegex(ValueError, "Prix vérifiés manquants"):
            fetch_fuel_prices.extract_prices_from_api([{
                "nom": "Gazole",
                "valeur": "1.60",
            }])

    def test_failed_refresh_does_not_replace_existing_prices(self):
        with tempfile.TemporaryDirectory() as directory:
            output_path = os.path.join(directory, "prices.json")
            original = '{"last_updated":null,"fuels":{}}\n'
            with open(output_path, "w", encoding="utf-8") as output:
                output.write(original)
            with patch.object(fetch_fuel_prices, "OUTPUT_PATH", output_path), patch.object(
                fetch_fuel_prices, "fetch_all_records", return_value=[{"nom": "Gazole", "valeur": "1.60"}]
            ), contextlib.redirect_stderr(io.StringIO()):
                result = fetch_fuel_prices.main()
            with open(output_path, encoding="utf-8") as saved:
                self.assertEqual(saved.read(), original)
            self.assertEqual(result, 1)


if __name__ == "__main__":
    unittest.main()
