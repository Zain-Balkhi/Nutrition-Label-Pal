import logging

from fastapi import APIRouter, HTTPException, Response

from app.models.schemas import LabelExportRequest
from app.services.label_renderer import LabelRenderer

logger = logging.getLogger(__name__)

router = APIRouter()
renderer = LabelRenderer()


@router.post("/labels/export")
async def export_label(request: LabelExportRequest):
    """Generate a PDF nutrition label and return it as a downloadable file."""
    if request.width_inches <= 0 or request.height_inches <= 0:
        raise HTTPException(status_code=422, detail="Dimensions must be positive")

    try:
        pdf_bytes = renderer.render_pdf(
            format=request.format.value,
            nutrition_data=request.model_dump(),
            width_inches=request.width_inches,
            height_inches=request.height_inches,
        )
    except OSError as e:
        logger.error("WeasyPrint failed — system libraries may be missing: %s", e)
        raise HTTPException(
            status_code=503,
            detail=(
                "PDF generation unavailable. "
                "Ensure WeasyPrint system dependencies are installed and "
                "DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib is set (macOS)."
            ),
        )

    safe_name = request.recipe_name.replace('"', "").replace("\\", "")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_name}_label.pdf"'
        },
    )
