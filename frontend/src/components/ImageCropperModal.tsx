import { useCallback, useEffect, useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import {
  cropImageToDataUrl,
  RECIPE_IMAGE_ASPECT,
} from '../utils/cropImage';

interface ImageCropperModalProps {
  /** Source image as a blob: or data: URL. */
  sourceUrl: string;
  /** Called with the 800x600 JPEG data URL when the user confirms. */
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}

export default function ImageCropperModal({
  sourceUrl,
  onSave,
  onCancel,
}: ImageCropperModalProps) {
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pixelCrop, setPixelCrop] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lock body scroll while the modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleCropComplete = useCallback(
    (_croppedArea: Area, croppedPixels: Area) => {
      setPixelCrop(croppedPixels);
    },
    [],
  );

  async function handleSave() {
    if (!pixelCrop) return;
    setSaving(true);
    setError(null);
    try {
      const dataUrl = await cropImageToDataUrl(sourceUrl, pixelCrop);
      onSave(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to crop image');
      setSaving(false);
    }
  }

  return (
    <div
      className="cropper-modal-backdrop"
      onClick={e => {
        if (e.target === e.currentTarget && !saving) onCancel();
      }}
    >
      <div className="cropper-modal">
        <div className="cropper-modal-header">
          <h3 className="cropper-modal-title">Position Your Recipe Photo</h3>
          <p className="cropper-modal-subtitle">
            Drag to reposition. Use the slider or pinch to zoom. The area inside
            the frame is what will be shown on your recipe.
          </p>
        </div>

        <div className="cropper-stage">
          <Cropper
            image={sourceUrl}
            crop={crop}
            zoom={zoom}
            aspect={RECIPE_IMAGE_ASPECT}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
            objectFit="contain"
            restrictPosition={true}
            zoomSpeed={0.5}
            minZoom={1}
            maxZoom={4}
          />
        </div>

        <div className="cropper-controls">
          <label className="cropper-zoom-label">
            Zoom
            <input
              type="range"
              min={1}
              max={4}
              step={0.01}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              className="cropper-zoom-slider"
              aria-label="Zoom"
            />
          </label>
        </div>

        {error && <div className="cropper-error">{error}</div>}

        <div className="cropper-modal-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-save-label btn-small"
            onClick={handleSave}
            disabled={saving || !pixelCrop}
          >
            {saving ? 'Saving…' : 'Use This Photo'}
          </button>
        </div>
      </div>
    </div>
  );
}
