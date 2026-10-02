import { Field, Input, Select } from '../../components/ui/Field';
import { periodLabels, type PeriodPreset } from './reportLogic';

export type PeriodValue = { preset: PeriodPreset; from: string; to: string };

type PeriodFilterProps = {
  value: PeriodValue;
  onChange: (value: PeriodValue) => void;
  /** Error del rango personalizado (ambos extremos, orden). */
  error?: string;
  presets?: PeriodPreset[];
};

/** Selector de período. Los días se interpretan en UTC, como el servidor. */
export function PeriodFilter({
  value,
  onChange,
  error,
  presets = ['all', 'today', 'last7', 'last30', 'custom'],
}: PeriodFilterProps) {
  return (
    <>
      <Field label="Período" hint="Fechas en UTC, igual que el servidor.">
        {(props) => (
          <Select
            {...props}
            value={value.preset}
            onChange={(e) =>
              onChange({ ...value, preset: e.target.value as PeriodPreset })
            }
          >
            {presets.map((preset) => (
              <option key={preset} value={preset}>
                {periodLabels[preset]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      {value.preset === 'custom' && (
        <>
          <Field label="Desde (UTC)">
            {(props) => (
              <Input
                {...props}
                type="date"
                value={value.from}
                max={value.to || undefined}
                onChange={(e) => onChange({ ...value, from: e.target.value })}
              />
            )}
          </Field>
          <Field label="Hasta (UTC)" error={error}>
            {(props) => (
              <Input
                {...props}
                type="date"
                value={value.to}
                min={value.from || undefined}
                onChange={(e) => onChange({ ...value, to: e.target.value })}
              />
            )}
          </Field>
        </>
      )}
    </>
  );
}
