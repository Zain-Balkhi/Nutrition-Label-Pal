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

    def test_empty(self):
        tn = TemplateNutrient.empty()
        assert tn.amount == 0
        assert tn.amount_str == "0"
        assert tn.dv_str == ""


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
