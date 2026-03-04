"""
Tests for unit_converter.py — amount parsing and gram conversion.

All offline, no API calls.
"""

import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.utils.unit_converter import convert_to_grams, WEIGHT_TO_GRAMS, VOLUME_TO_ML


class TestWeightConversion:
    """Direct weight-to-gram conversions."""

    def test_grams(self):
        assert convert_to_grams(200, "g") == 200.0

    def test_grams_singular(self):
        assert convert_to_grams(1, "gram") == 1.0

    def test_kilograms(self):
        assert convert_to_grams(1, "kg") == 1000.0

    def test_ounces(self):
        assert convert_to_grams(1, "oz") == pytest.approx(28.3495)

    def test_pounds(self):
        assert convert_to_grams(1, "lb") == pytest.approx(453.592)

    def test_pounds_plural(self):
        assert convert_to_grams(2, "lbs") == pytest.approx(907.184)


class TestVolumeConversion:
    """Volume units fall back to water-density (1 ml ≈ 1 g) without portions."""

    def test_cup_water_fallback(self):
        result = convert_to_grams(1, "cup")
        assert result == pytest.approx(236.588)

    def test_tbsp_water_fallback(self):
        result = convert_to_grams(2, "tbsp")
        assert result == pytest.approx(29.574)

    def test_tsp_water_fallback(self):
        result = convert_to_grams(1, "tsp")
        assert result == pytest.approx(4.929)

    def test_ml(self):
        assert convert_to_grams(250, "ml") == 250.0


class TestVolumeWithPortions:
    """Volume units should prefer USDA portion data when available."""

    def test_cup_with_portion_match(self):
        portions = [
            {"modifier": "1 cup", "gramWeight": 128.0, "measureUnit": {"name": "cup"}, "portionDescription": "1 cup"},
        ]
        result = convert_to_grams(1, "cup", portions)
        assert result == 128.0  # uses USDA portion, not water density

    def test_tbsp_with_portion_match(self):
        portions = [
            {"modifier": "1 tbsp", "gramWeight": 13.5, "measureUnit": {"name": "tbsp"}, "portionDescription": "1 tbsp"},
        ]
        result = convert_to_grams(2, "tbsp", portions)
        assert result == 27.0


class TestCountUnits:
    """Count-based units (each, medium, large etc)."""

    def test_each_with_portion(self):
        portions = [
            {"modifier": "1 each", "gramWeight": 50.0, "measureUnit": {}, "portionDescription": "1 large egg"},
        ]
        result = convert_to_grams(2, "each", portions)
        assert result == 100.0

    def test_each_no_portion_fallback(self):
        # Falls back to first available portion, or 100g
        result = convert_to_grams(1, "each")
        assert result == 100.0

    def test_medium_with_portion(self):
        portions = [
            {"modifier": "1 medium", "gramWeight": 123.0, "measureUnit": {}, "portionDescription": "medium"},
        ]
        result = convert_to_grams(1, "medium", portions)
        assert result == 123.0


class TestUnknownUnit:
    """Unknown units should default to 100g per unit."""

    def test_unknown_defaults_to_100g(self):
        assert convert_to_grams(1, "widget") == 100.0

    def test_unknown_with_portion_match(self):
        portions = [
            {"modifier": "1 widget", "gramWeight": 75.0, "measureUnit": {}, "portionDescription": "widget"},
        ]
        assert convert_to_grams(2, "widget", portions) == 150.0
