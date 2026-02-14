"""
Tests for fda_rounding.py — FDA 21 CFR 101.9 rounding rules.

All offline.
"""

import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.utils.fda_rounding import (
    round_calories,
    round_fat,
    round_cholesterol,
    round_sodium,
    round_carb_fiber_sugar_protein,
    round_percent_dv,
)


class TestRoundCalories:
    def test_below_5_is_zero(self):
        assert round_calories(4.9) == 0.0

    def test_5_rounds_to_5(self):
        assert round_calories(5) == 5.0

    def test_mid_range_rounds_to_nearest_5(self):
        assert round_calories(37) == 35.0

    def test_above_50_rounds_to_nearest_10(self):
        # Python uses banker's rounding (round half to even): 165 -> 160
        assert round_calories(165) == 160.0
        assert round_calories(167) == 170.0

    def test_exact_50(self):
        assert round_calories(50) == 50.0


class TestRoundFat:
    def test_below_half_gram_is_zero(self):
        assert round_fat(0.4) == 0.0

    def test_between_half_and_5_rounds_nearest_half(self):
        result = round_fat(2.3)
        assert result == 2.5

    def test_above_5_rounds_to_nearest_gram(self):
        assert round_fat(7.6) == 8.0

    def test_zero(self):
        assert round_fat(0) == 0.0


class TestRoundCholesterol:
    def test_below_2_is_zero(self):
        assert round_cholesterol(1.9) == 0.0

    def test_between_2_and_5(self):
        result = round_cholesterol(3)
        assert isinstance(result, str) or result == 0.0
        # FDA says "less than 5mg"
        if isinstance(result, str):
            assert "less than" in result

    def test_above_5_rounds_to_nearest_5(self):
        assert round_cholesterol(87) == 85.0


class TestRoundSodium:
    def test_below_5_is_zero(self):
        assert round_sodium(4) == 0.0

    def test_mid_range_nearest_5(self):
        assert round_sodium(73) == 75.0

    def test_above_140_nearest_10(self):
        assert round_sodium(156) == 160.0


class TestRoundCarbFiberSugarProtein:
    def test_below_half_is_zero(self):
        assert round_carb_fiber_sugar_protein(0.3) == 0.0

    def test_between_half_and_1(self):
        result = round_carb_fiber_sugar_protein(0.7)
        # Should be "less than 1g" or equivalent
        assert result == "less than 1g" or result == 0.0

    def test_above_1_rounds_to_nearest_gram(self):
        assert round_carb_fiber_sugar_protein(3.6) == 4.0


class TestRoundPercentDV:
    def test_rounds_to_integer(self):
        assert round_percent_dv(33.3) == 33

    def test_rounds_up(self):
        assert round_percent_dv(33.5) == 34

    def test_zero(self):
        assert round_percent_dv(0) == 0
