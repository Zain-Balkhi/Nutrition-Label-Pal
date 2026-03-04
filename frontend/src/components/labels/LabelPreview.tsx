import type { NutrientValue, LabelFormat } from '../../types';
import { LABEL_FORMAT_INFO } from '../../types';
import VerticalLabel from './VerticalLabel';
import TabularLabel from './TabularLabel';
import LinearLabel from './LinearLabel';
import DualColumnLabel from './DualColumnLabel';

interface LabelPreviewProps {
  format: LabelFormat;
  onFormatChange: (format: LabelFormat) => void;
  nutrients: NutrientValue[];
  servings: number;
  serving_size: string;
}

const FORMATS: LabelFormat[] = ['vertical', 'tabular', 'linear', 'dual_column'];

function FormatCard({ format, selected, onClick }: {
  format: LabelFormat;
  selected: boolean;
  onClick: () => void;
}) {
  const info = LABEL_FORMAT_INFO[format];
  return (
    <button
      type="button"
      className={`format-card ${selected ? 'format-card-selected' : ''}`}
      onClick={onClick}
    >
      <span className="format-card-name">{info.name}</span>
      <span className="format-card-desc">{info.description}</span>
    </button>
  );
}

export default function LabelPreview({
  format,
  onFormatChange,
  nutrients,
  servings,
  serving_size,
}: LabelPreviewProps) {
  const labelProps = { nutrients, servings, serving_size };

  return (
    <div className="label-preview-wrapper">
      <div className="format-selector">
        {FORMATS.map(f => (
          <FormatCard
            key={f}
            format={f}
            selected={f === format}
            onClick={() => onFormatChange(f)}
          />
        ))}
      </div>

      <div className={`label-container label-format-${format}`}>
        <div className="nutrition-label">
          {format === 'vertical' && <VerticalLabel {...labelProps} />}
          {format === 'tabular' && <TabularLabel {...labelProps} />}
          {format === 'linear' && <LinearLabel {...labelProps} />}
          {format === 'dual_column' && <DualColumnLabel {...labelProps} />}
        </div>
      </div>
    </div>
  );
}
