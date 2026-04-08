import './Tags.css';

const PALETTE = [
  '#f5a623',
  '#a8c5a0',
  '#e74c3c',
  '#3498db',
  '#9b59b6',
  '#1abc9c',
  '#e67e22',
  '#34495e',
  '#f39c12',
  '#2ecc71',
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export default function ColorPicker({ value, onChange }: ColorPickerProps) {
  const isCustom = !PALETTE.includes(value);

  return (
    <div className="color-picker">
      {PALETTE.map(color => (
        <button
          key={color}
          type="button"
          className={`color-swatch ${value === color ? 'color-swatch-selected' : ''}`}
          style={{ backgroundColor: color }}
          onClick={() => onChange(color)}
          aria-label={`Select color ${color}`}
        />
      ))}
      <div className={`color-picker-custom ${isCustom ? 'color-swatch-selected' : ''}`}>
        <input
          type="color"
          value={isCustom ? value : '#000000'}
          onChange={e => onChange(e.target.value)}
          aria-label="Pick custom color"
        />
      </div>
    </div>
  );
}
