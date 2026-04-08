"""Tests for the label export endpoint and label renderer service."""

import os
import sys

import pytest
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.label_renderer import (
    LabelRenderer,
    TemplateNutrient,
    _build_template_context,
)


# ── Test data ──────────────────────────────────────────────────────────────

SAMPLE_NUTRIENTS = [
    {"name": "Calories", "amount": 230, "unit": "kcal", "daily_value_percent": None, "display_value": None},
    {"name": "Total Fat", "amount": 8, "unit": "g", "daily_value_percent": 10, "display_value": None},
    {"name": "Saturated Fat", "amount": 1, "unit": "g", "daily_value_percent": 5, "display_value": None},
    {"name": "Trans Fat", "amount": 0, "unit": "g", "daily_value_percent": None, "display_value": None},
    {"name": "Cholesterol", "amount": 0, "unit": "mg", "daily_value_percent": 0, "display_value": None},
    {"name": "Sodium", "amount": 160, "unit": "mg", "daily_value_percent": 7, "display_value": None},
    {"name": "Total Carbohydrate", "amount": 37, "unit": "g", "daily_value_percent": 13, "display_value": None},
    {"name": "Dietary Fiber", "amount": 4, "unit": "g", "daily_value_percent": 14, "display_value": None},
    {"name": "Total Sugars", "amount": 12, "unit": "g", "daily_value_percent": None, "display_value": None},
    {"name": "Protein", "amount": 3, "unit": "g", "daily_value_percent": None, "display_value": None},
    {"name": "Vitamin D", "amount": 2.0, "unit": "mcg", "daily_value_percent": 10, "display_value": None},
    {"name": "Calcium", "amount": 260.0, "unit": "mg", "daily_value_percent": 20, "display_value": None},
    {"name": "Iron", "amount": 8.0, "unit": "mg", "daily_value_percent": 45, "display_value": None},
    {"name": "Potassium", "amount": 235.0, "unit": "mg", "daily_value_percent": 6, "display_value": None},
]

SAMPLE_REQUEST = {
    "format": "vertical",
    "width_inches": 2.75,
    "height_inches": 5.0,
    "recipe_name": "Test Recipe",
    "servings": 8,
    "serving_size": "2/3 cup (55g)",
    "nutrients": SAMPLE_NUTRIENTS,
}


def _make_request(**overrides):
    """Create a label export request dict with optional overrides."""
    req = dict(SAMPLE_REQUEST)
    req.update(overrides)
    return req


# ── Fixtures ───────────────────────────────────────────────────────────────

@pytest.fixture()
def transport():
    return ASGITransport(app=app)


# ── TemplateNutrient unit tests ────────────────────────────────────────────

class TestTemplateNutrient:
    def test_from_nutrient_dict_with_dv(self):
        n = {"name": "Total Fat", "amount": 8, "unit": "g",
             "daily_value_percent": 10, "display_value": None}
        tn = TemplateNutrient.from_nutrient_dict(n)
        assert tn.amount == 8
        assert tn.unit == "g"
        assert tn.amount_str == "8g"
        assert tn.display == ""
        assert tn.dv_str == "10%"

    def test_from_nutrient_dict_no_dv(self):
        n = {"name": "Calories", "amount": 230, "unit": "kcal",
             "daily_value_percent": None, "display_value": None}
        tn = TemplateNutrient.from_nutrient_dict(n)
        assert tn.dv_str == ""
        assert tn.amount_str == "230kcal"

    def test_from_nutrient_dict_with_display_value(self):
        n = {"name": "Cholesterol", "amount": 0.0, "unit": "mg",
             "daily_value_percent": 0, "display_value": "< 5mg"}
        tn = TemplateNutrient.from_nutrient_dict(n)
        assert tn.display == "< 5mg"
        assert tn.amount == 0.0

    def test_from_nutrient_dict_container_values(self):
        n = {"name": "Total Fat", "amount": 8, "unit": "g",
             "daily_value_percent": 10, "display_value": None}
        tn = TemplateNutrient.from_nutrient_dict(n, servings=3)
        assert tn.container_amount_str == "24g"
        assert tn.container_dv_str == "30%"

    def test_from_nutrient_dict_container_no_dv(self):
        n = {"name": "Trans Fat", "amount": 1, "unit": "g",
             "daily_value_percent": None, "display_value": None}
        tn = TemplateNutrient.from_nutrient_dict(n, servings=4)
        assert tn.container_amount_str == "4g"
        assert tn.container_dv_str == ""

    def test_empty(self):
        tn = TemplateNutrient.empty()
        assert tn.amount == 0
        assert tn.amount_str == "0"
        assert tn.dv_str == ""
        assert tn.container_amount_str == ""
        assert tn.container_dv_str == ""


# ── Template context builder tests ─────────────────────────────────────────

class TestBuildTemplateContext:
    def test_builds_all_nutrient_vars(self):
        data = {
            "recipe_name": "Test",
            "servings": 4,
            "serving_size": "1 cup",
            "nutrients": SAMPLE_NUTRIENTS,
        }
        ctx = _build_template_context(data, "2.75in", "5in")
        assert ctx["recipe_name"] == "Test"
        assert ctx["servings"] == 4
        assert ctx["serving_size"] == "1 cup"
        assert ctx["calories_amount"] == 230
        assert ctx["total_fat"].amount == 8
        assert ctx["sodium"].dv_str == "7%"
        assert ctx["width"] == "2.75in"

    def test_missing_nutrient_uses_empty(self):
        data = {"nutrients": []}
        ctx = _build_template_context(data, "2in", "3in")
        assert ctx["total_fat"].amount == 0
        assert ctx["calories_amount"] == 0


# ── LabelRenderer unit tests ──────────────────────────────────────────────

class TestLabelRenderer:
    def test_render_html_produces_html(self):
        renderer = LabelRenderer()
        html = renderer.render_html(
            format="vertical",
            nutrition_data={
                "recipe_name": "Test",
                "servings": 4,
                "serving_size": "1 cup",
                "nutrients": SAMPLE_NUTRIENTS,
            },
            width_inches=2.75,
            height_inches=5.0,
        )
        assert "Nutrition Facts" in html
        assert "Total Fat" in html
        assert "8g" in html
        assert "2.75in" in html

    def test_render_pdf_calls_weasyprint(self):
        mock_html_class = MagicMock()
        mock_doc = MagicMock()
        mock_doc.write_pdf.return_value = b"%PDF-1.4 fake"
        mock_html_class.return_value = mock_doc

        # Inject a fake weasyprint module so the lazy import works
        fake_weasyprint = MagicMock()
        fake_weasyprint.HTML = mock_html_class
        import sys
        sys.modules["weasyprint"] = fake_weasyprint
        try:
            renderer = LabelRenderer()
            pdf = renderer.render_pdf(
                format="vertical",
                nutrition_data={
                    "recipe_name": "Test",
                    "servings": 4,
                    "serving_size": "1 cup",
                    "nutrients": SAMPLE_NUTRIENTS,
                },
                width_inches=2.75,
                height_inches=5.0,
            )
            assert pdf == b"%PDF-1.4 fake"
            mock_html_class.assert_called_once()
            mock_doc.write_pdf.assert_called_once()
        finally:
            del sys.modules["weasyprint"]


# ── Endpoint integration tests (WeasyPrint mocked) ────────────────────────

@pytest.mark.asyncio
class TestLabelExportEndpoint:
    @patch("app.routers.label_export.renderer")
    async def test_export_returns_pdf(self, mock_renderer, transport):
        mock_renderer.render_pdf.return_value = b"%PDF-1.4 test content"

        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.post("/api/labels/export", json=_make_request())

        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/pdf"
        assert resp.content.startswith(b"%PDF")
        assert "Test Recipe_label.pdf" in resp.headers["content-disposition"]

    @patch("app.routers.label_export.renderer")
    async def test_export_vertical_format(self, mock_renderer, transport):
        mock_renderer.render_pdf.return_value = b"%PDF-1.4"
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.post("/api/labels/export", json=_make_request(format="vertical"))
        assert resp.status_code == 200
        mock_renderer.render_pdf.assert_called_once()
        call_kwargs = mock_renderer.render_pdf.call_args
        assert call_kwargs.kwargs.get("format") or call_kwargs[1].get("format") or call_kwargs[0][0] == "vertical"

    async def test_export_invalid_format_returns_422(self, transport):
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.post(
                "/api/labels/export",
                json=_make_request(format="nonexistent"),
            )
        assert resp.status_code == 422

    @patch("app.routers.label_export.renderer")
    async def test_export_negative_dimensions_returns_422(self, mock_renderer, transport):
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.post(
                "/api/labels/export",
                json=_make_request(width_inches=-1, height_inches=5),
            )
        assert resp.status_code == 422

    @patch("app.routers.label_export.renderer")
    async def test_export_zero_dimensions_returns_422(self, mock_renderer, transport):
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.post(
                "/api/labels/export",
                json=_make_request(width_inches=0, height_inches=5),
            )
        assert resp.status_code == 422

    async def test_export_missing_nutrients_returns_422(self, transport):
        req = _make_request()
        del req["nutrients"]
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.post("/api/labels/export", json=req)
        assert resp.status_code == 422

    @patch("app.routers.label_export.renderer")
    async def test_export_default_dimensions(self, mock_renderer, transport):
        mock_renderer.render_pdf.return_value = b"%PDF-1.4"
        req = _make_request()
        del req["width_inches"]
        del req["height_inches"]
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.post("/api/labels/export", json=req)
        assert resp.status_code == 200

    @patch("app.routers.label_export.renderer")
    async def test_export_filename_sanitized(self, mock_renderer, transport):
        mock_renderer.render_pdf.return_value = b"%PDF-1.4"
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.post(
                "/api/labels/export",
                json=_make_request(recipe_name='My "Special" Recipe'),
            )
        assert resp.status_code == 200
        assert '"' not in resp.headers["content-disposition"].replace(
            'attachment; filename="', ""
        ).rstrip('"')


# ── Tabular template tests ─────────────────────────────────────────────────

class TestTabularTemplate:
    def test_render_html_tabular_has_horizontal_layout(self):
        renderer = LabelRenderer()
        html = renderer.render_html(
            format="tabular",
            nutrition_data={
                "recipe_name": "Test",
                "servings": 4,
                "serving_size": "1 cup",
                "nutrients": SAMPLE_NUTRIENTS,
            },
            width_inches=4.5,
            height_inches=2.0,
        )
        assert "Nutrition Facts" in html
        # Tabular uses abbreviated names
        assert "Tot. Carb." in html
        assert "Sat. Fat" in html
        # Has horizontal table class
        assert "nf-htable" in html
        # Contains all nutrient values
        assert "8g" in html  # Total Fat
        assert "160mg" in html  # Sodium

    def test_render_html_tabular_has_vitamins_row(self):
        renderer = LabelRenderer()
        html = renderer.render_html(
            format="tabular",
            nutrition_data={
                "recipe_name": "Test",
                "servings": 4,
                "serving_size": "1 cup",
                "nutrients": SAMPLE_NUTRIENTS,
            },
            width_inches=4.5,
            height_inches=2.0,
        )
        assert "Vitamin D" in html
        assert "Calcium" in html
        assert "Iron" in html
        assert "Potassium" in html


# ── Linear template tests ─────────────────────────────────────────────────

class TestLinearTemplate:
    def test_render_html_linear_has_comma_separated(self):
        renderer = LabelRenderer()
        html = renderer.render_html(
            format="linear",
            nutrition_data={
                "recipe_name": "Test",
                "servings": 4,
                "serving_size": "1 cup",
                "nutrients": SAMPLE_NUTRIENTS,
            },
            width_inches=3.5,
            height_inches=1.5,
        )
        assert "Nutrition Facts" in html
        # Uses abbreviated names
        assert "Chol." in html
        assert "Tot. Carb." in html
        assert "Sat. Fat" in html
        # Has DV percentages inline
        assert "(10% DV)" in html  # Total Fat
        # No table structure
        assert "nf-linear-nutrients" in html

    def test_render_html_linear_omits_dv_when_none(self):
        renderer = LabelRenderer()
        html = renderer.render_html(
            format="linear",
            nutrition_data={
                "recipe_name": "Test",
                "servings": 1,
                "serving_size": "1 piece",
                "nutrients": [
                    {"name": "Calories", "amount": 100, "unit": "kcal",
                     "daily_value_percent": None, "display_value": None},
                    {"name": "Total Fat", "amount": 5, "unit": "g",
                     "daily_value_percent": None, "display_value": None},
                ],
            },
            width_inches=3.5,
            height_inches=1.5,
        )
        # Total Fat with no DV should not have "(DV)" text
        assert "5g," in html
        # Should not contain "( DV)" for fat since dv is None
        assert "(None%" not in html


# ── Dual column template tests ────────────────────────────────────────────

class TestDualColumnTemplate:
    def test_render_html_dual_column_has_per_container(self):
        renderer = LabelRenderer()
        html = renderer.render_html(
            format="dual_column",
            nutrition_data={
                "recipe_name": "Test",
                "servings": 4,
                "serving_size": "1 cup",
                "nutrients": SAMPLE_NUTRIENTS,
            },
            width_inches=3.25,
            height_inches=5.5,
        )
        assert "Nutrition Facts" in html
        assert "Per serving" in html
        assert "Per container" in html
        # Per-container calories: 230 * 4 = 920
        assert "920" in html
        # Has dual table structure
        assert "nf-dual-table" in html

    def test_render_html_dual_column_container_values(self):
        renderer = LabelRenderer()
        html = renderer.render_html(
            format="dual_column",
            nutrition_data={
                "recipe_name": "Test",
                "servings": 2,
                "serving_size": "1/2 cup",
                "nutrients": [
                    {"name": "Calories", "amount": 100, "unit": "kcal",
                     "daily_value_percent": None, "display_value": None},
                    {"name": "Total Fat", "amount": 5, "unit": "g",
                     "daily_value_percent": 6, "display_value": None},
                ],
            },
            width_inches=3.25,
            height_inches=5.5,
        )
        # Per-container: 100 * 2 = 200 cal
        assert "200" in html
        # Per-container fat: 5 * 2 = 10g
        assert "10g" in html
        # Per-container DV: 6 * 2 = 12%
        assert "12%" in html


# ── Context builder: container values ──────────────────────────────────────

class TestBuildTemplateContextContainer:
    def test_container_calories_amount(self):
        data = {
            "recipe_name": "Test",
            "servings": 4,
            "serving_size": "1 cup",
            "nutrients": SAMPLE_NUTRIENTS,
        }
        ctx = _build_template_context(data, "3in", "5in")
        assert ctx["container_calories_amount"] == 920  # 230 * 4

    def test_container_nutrient_values(self):
        data = {
            "recipe_name": "Test",
            "servings": 3,
            "serving_size": "1 cup",
            "nutrients": [
                {"name": "Total Fat", "amount": 10, "unit": "g",
                 "daily_value_percent": 13, "display_value": None},
            ],
        }
        ctx = _build_template_context(data, "3in", "5in")
        assert ctx["total_fat"].container_amount_str == "30g"
        assert ctx["total_fat"].container_dv_str == "39%"


# ── Endpoint tests for new formats ────────────────────────────────────────

@pytest.mark.asyncio
class TestLabelExportEndpointFormats:
    @patch("app.routers.label_export.renderer")
    async def test_export_tabular_format(self, mock_renderer, transport):
        mock_renderer.render_pdf.return_value = b"%PDF-1.4"
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.post("/api/labels/export", json=_make_request(format="tabular"))
        assert resp.status_code == 200

    @patch("app.routers.label_export.renderer")
    async def test_export_linear_format(self, mock_renderer, transport):
        mock_renderer.render_pdf.return_value = b"%PDF-1.4"
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.post("/api/labels/export", json=_make_request(format="linear"))
        assert resp.status_code == 200

    @patch("app.routers.label_export.renderer")
    async def test_export_dual_column_format(self, mock_renderer, transport):
        mock_renderer.render_pdf.return_value = b"%PDF-1.4"
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.post("/api/labels/export", json=_make_request(format="dual_column"))
        assert resp.status_code == 200


# ── Full integration test (real WeasyPrint) ───────────────────────────────

class TestLabelRendererIntegration:
    """These tests actually run WeasyPrint to verify real PDF output."""

    def test_vertical_produces_valid_pdf(self):
        renderer = LabelRenderer()
        pdf = renderer.render_pdf(
            format="vertical",
            nutrition_data={
                "recipe_name": "Integration Test",
                "servings": 4,
                "serving_size": "1 cup",
                "nutrients": SAMPLE_NUTRIENTS,
            },
            width_inches=2.75,
            height_inches=5.0,
        )
        assert pdf[:5] == b"%PDF-"
        assert len(pdf) > 100
