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
  aVolumeMaxRatio: 0.8,
  aMaxWickPrice: 0,
  bVolumeMinRatio: 1.5,
  volumeLookback: 20,
  riskReward: 2,
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
          name="aVolumeMaxRatio"
          label="Свеча A: объём ≤ (× средн.)"
          type="number"
          inputProps={{ step: 0.1, min: 0 }}
          size="small"
          fullWidth
        />
        <TextFieldElement
          name="aMaxWickPrice"
          label="Свеча A: макс. фитиль (цена, 0 = выкл)"
          type="number"
          inputProps={{ step: 'any', min: 0 }}
          size="small"
          fullWidth
        />
        <TextFieldElement
          name="bVolumeMinRatio"
          label="Свеча B (разворотная): объём ≥ (× средн.)"
          type="number"
          inputProps={{ step: 0.1, min: 0 }}
          size="small"
          fullWidth
        />
        <TextFieldElement
          name="volumeLookback"
          label="Окно среднего объёма (баров)"
          type="number"
          inputProps={{ step: 1, min: 1 }}
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
