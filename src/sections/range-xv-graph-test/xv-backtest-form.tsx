import { FormContainer, TextFieldElement, RadioButtonGroup, useFormContext } from "react-hook-form-mui";
import { Controller } from "react-hook-form";
import { Box, TextField, Button, CircularProgress } from "@mui/material";
import moment from "moment";

/** datetime-local field bound to a millisecond-timestamp form value (UTC). */
function DateTsField({ name, label }: { name: string; label: string }) {
  const { control } = useFormContext();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <TextField
          label={label}
          type="datetime-local"
          size="small"
          fullWidth
          InputLabelProps={{ shrink: true }}
          value={field.value ? moment.utc(Number(field.value)).format('YYYY-MM-DDTHH:mm') : ''}
          onChange={(e) => field.onChange(e.target.value ? moment.utc(e.target.value).valueOf() : null)}
        />
      )}
    />
  );
}

export const DEFAULT_XV_BACKTEST_VALUES = {
  aVolumeMax: 0,
  aMaxWickBodyPct: 0,
  bVolumeMin: 0,
  minTrendCandles: 2,
  riskReward: 2,
  breakEvenAfterBars: 0,
  entryFeePct: 0.055,
  exitFeePct: 0.02,
  positionSize: 100,
  direction: '',
  maxBarsToHold: 50,
  startTs: Date.UTC(2026, 0, 1),
  finishTs: null as number | null,
};

export function XvBacktestForm({ defaultValues, onSubmit, isRunning }: any) {
  return (
    <FormContainer defaultValues={defaultValues} onSuccess={onSubmit}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <RadioButtonGroup
          name="direction"
          label="Направление"
          row
          options={[
            { id: '', label: 'Любое' },
            { id: 'long', label: 'Лонг' },
            { id: 'short', label: 'Шорт' },
          ]}
        />
        <TextFieldElement
          name="aVolumeMax"
          label="Свеча A: объём ≤ (0 = выкл)"
          type="number"
          inputProps={{ step: 'any', min: 0 }}
          size="small"
          fullWidth
        />
        <TextFieldElement
          name="aMaxWickBodyPct"
          label="Свеча A: макс. фитиль (% от тела; 0 = без фитиля)"
          type="number"
          inputProps={{ step: 'any', min: 0 }}
          size="small"
          fullWidth
        />
        <TextFieldElement
          name="bVolumeMin"
          label="Свеча B (разворотная): объём ≥ (0 = выкл)"
          type="number"
          inputProps={{ step: 'any', min: 0 }}
          size="small"
          fullWidth
        />
        <TextFieldElement
          name="minTrendCandles"
          label="Мин. трендовых свечей перед разворотной (≥2)"
          type="number"
          inputProps={{ step: 1, min: 2 }}
          size="small"
          fullWidth
        />
        <TextFieldElement
          name="riskReward"
          label="Тейк (R:R)"
          type="number"
          inputProps={{ step: 0.1, min: 0.1 }}
          size="small"
          fullWidth
        />
        <TextFieldElement
          name="breakEvenAfterBars"
          label="Безубыток после N баров по тренду (0 = выкл)"
          type="number"
          inputProps={{ step: 1, min: 0 }}
          size="small"
          fullWidth
        />
        <TextFieldElement
          name="entryFeePct"
          label="Комиссия входа (% от цены)"
          type="number"
          inputProps={{ step: 'any', min: 0 }}
          size="small"
          fullWidth
        />
        <TextFieldElement
          name="exitFeePct"
          label="Комиссия выхода (% от цены)"
          type="number"
          inputProps={{ step: 'any', min: 0 }}
          size="small"
          fullWidth
        />
        <TextFieldElement
          name="positionSize"
          label="Размер позиции ($)"
          type="number"
          inputProps={{ step: 'any', min: 0 }}
          size="small"
          fullWidth
        />
        <TextFieldElement
          name="maxBarsToHold"
          label="Макс. баров в позиции"
          type="number"
          inputProps={{ step: 1, min: 1 }}
          size="small"
          fullWidth
        />
        <DateTsField name="startTs" label="Начало" />
        <DateTsField name="finishTs" label="Конец (необязательно)" />
        <Button
          type="submit"
          variant="contained"
          disabled={isRunning}
          startIcon={isRunning ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {isRunning ? 'Тест…' : 'Запустить тест'}
        </Button>
      </Box>
    </FormContainer>
  );
}
