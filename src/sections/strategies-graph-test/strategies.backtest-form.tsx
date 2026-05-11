import {FormContainer, MultiSelectElement, RadioButtonGroup, TextFieldElement} from "react-hook-form-mui";
import {Box, Button, Grid, IconButton, TextField, Tooltip} from "@mui/material";
import CustomFormButton from "@/src/components/custom-form-button/custom-form-button";
import {object, array, string, union, literal} from "zod";
import {zodNumberSchema, zodStringSchema} from "@/src/helpers/form-validation.helper";
import {zodResolver} from "@hookform/resolvers/zod";
import {Controller, useFormContext, useWatch} from "react-hook-form";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import moment from "moment";

const FAVORITE_MATCH_KEYS = [
  'enterLevel1', 'enterLevel2', 'enterLevel3',
  'takeProfitLevel1', 'takeProfitLevel2', 'takeProfitLevel3',
  'stopLossLevel',
  'minPriceSize', 'direction', 'maxSessionLength',
  'startTs', 'finishTs',
  'entryMode', 'fppEntryTypes', 'fppStopLossMode', 'fppStopLossPoints',
] as const;

export const FPP_TYPE_OPTIONS = [
  { id: 'interception', label: 'Interception' },
  { id: 'reverse', label: 'Reverse' },
  { id: 'locked_volume', label: 'Locked volume' },
  { id: 'locked_delta', label: 'Locked delta' },
  { id: 'locked_imbalance', label: 'Locked imbalance' },
  { id: 'test_volume', label: 'Test volume' },
  { id: 'resistance', label: 'Resistance' },
  { id: 'weakness', label: 'Weakness' },
  { id: 'low_last_price_volume', label: 'Low last price volume' },
];

function favoritesMatch(a: any, b: any): boolean {
  for (const k of FAVORITE_MATCH_KEYS) {
    if (normalizeForMatch(a?.[k]) !== normalizeForMatch(b?.[k])) return false;
  }
  return true;
}

function normalizeForMatch(v: any): string {
  // Sort arrays so order doesn't matter (fppEntryTypes is a set, not a list).
  if (Array.isArray(v)) return [...v].map(String).sort().join(',');
  return String(v ?? '');
}

function FavoriteToggle({ favorites, onToggleFavorite }: { favorites: any[]; onToggleFavorite: (values: any) => void }) {
  const { getValues } = useFormContext();
  const values = useWatch();
  const isFavorite = (favorites || []).some((f: any) => favoritesMatch(f.data, values));
  return (
    <Tooltip title={isFavorite ? 'Удалить из избранного' : 'Сохранить в избранное'}>
      <IconButton
        type="button"
        size="small"
        onClick={() => onToggleFavorite(getValues())}
        sx={{ color: isFavorite ? '#e91e63' : 'text.secondary' }}
      >
        {isFavorite ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
}

function DateTsField({ name, label }: { name: string; label: string }) {
  const { control } = useFormContext();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          label={label}
          type="datetime-local"
          size="small"
          fullWidth
          InputLabelProps={{ shrink: true }}
          error={!!fieldState.error}
          helperText={fieldState.error?.message}
          value={field.value ? moment.utc(Number(field.value)).format('YYYY-MM-DDTHH:mm') : ''}
          onChange={(e) => {
            const ts = e.target.value ? moment.utc(e.target.value).valueOf() : null;
            field.onChange(ts);
          }}
        />
      )}
    />
  );
}

function ResetButton({ resetValues }: { resetValues: any }) {
  const { reset } = useFormContext();
  return (
    <Button
      type="button"
      variant="outlined"
      size="small"
      fullWidth
      sx={{ mt: 1 }}
      onClick={() => reset(resetValues)}
    >
      Сбросить
    </Button>
  );
}

// FPP entry types are an extra gate on top of the fib enterLevel — when
// the entryMode is 'fpp', triggering also requires that at least one FPP
// of one of the selected types (and matching session direction) has
// appeared by the time price reaches the enterLevel.
function FppEntryFilters() {
  const entryMode = useWatch({ name: 'entryMode' }) ?? 'levels';
  const stopMode = useWatch({ name: 'fppStopLossMode' }) ?? 'candle';
  if (entryMode !== 'fpp') return null;
  return (
    <>
      <Grid item size={12}>
        <MultiSelectElement
          name='fppEntryTypes'
          fullWidth
          showCheckbox
          size='small'
          label='Required FPP patterns'
          options={FPP_TYPE_OPTIONS}
          MenuProps={{ PaperProps: { style: { maxHeight: 1000 } } }}
        />
      </Grid>
      <Grid item size={12}>
        <RadioButtonGroup
          name='fppStopLossMode'
          label='Stop loss source'
          row
          options={[
            { id: 'candle', label: 'FPP candle ± N ticks' },
            { id: 'fib', label: 'Fib stopLossLevel' },
          ]}
        />
      </Grid>
      {stopMode === 'candle' && (
        <Grid item size={12}>
          <TextFieldElement
            name='fppStopLossPoints'
            label='N price ticks'
            type='number'
            size='small'
            fullWidth
          />
        </Grid>
      )}
    </>
  );
}

export function StrategiesBacktestForm({
  defaultValues, isLoading, onSubmit, resetValues,
  favorites, onToggleFavorite,
}: any) {
  const showFavorites = typeof onToggleFavorite === 'function';
  return (
    <FormContainer
      defaultValues={defaultValues}
      resolver={zodResolver(object({
        pairId: zodNumberSchema(),
        tf: zodNumberSchema(),
        enterLevel1: zodNumberSchema(),
        takeProfitLevel1: zodNumberSchema(),
        enterLevel2: zodNumberSchema().nullish(),
        takeProfitLevel2: zodNumberSchema().nullish(),
        enterLevel3: zodNumberSchema().nullish(),
        takeProfitLevel3: zodNumberSchema().nullish(),
        triggerLevel: zodNumberSchema().nullish(),
        stopLossLevel: zodNumberSchema(),
        finishLevel: zodNumberSchema().nullish(),
        minPriceSize: zodNumberSchema(),
        direction: zodStringSchema().nullish(),
        maxSessionLength: zodNumberSchema(),
        startTs: zodNumberSchema(),
        finishTs: zodNumberSchema().nullish(),
        entryMode: union([literal('levels'), literal('fpp')]).nullish(),
        fppEntryTypes: array(string()).nullish(),
        fppStopLossPoints: zodNumberSchema().nullish(),
        fppStopLossMode: union([literal('fib'), literal('candle')]).nullish(),
      }))}
      onSuccess={onSubmit}
    >
      <Grid container direction='row' spacing={2}>
        <Grid item size={12}>
          <RadioButtonGroup
            name='entryMode'
            label='Entry mode'
            row
            options={[
              { id: 'levels', label: 'Enter level' },
              { id: 'fpp', label: 'Enter level by FPP' },
            ]}
          />
        </Grid>
        <FppEntryFilters />
        <Grid item size={6}>
          <TextFieldElement
            name='enterLevel1'
            label='Enter level 1'
            type='number'
            size='small'
            fullWidth
          />
        </Grid>
        <Grid item size={6}>
          <TextFieldElement
            name='takeProfitLevel1'
            label='Take profit level 1'
            type='number'
            size='small'
            fullWidth
          />
        </Grid>
        <Grid item size={6}>
          <TextFieldElement
            name='enterLevel2'
            label='Enter level 2'
            type='number'
            size='small'
            fullWidth
          />
        </Grid>
        <Grid item size={6}>
          <TextFieldElement
            name='takeProfitLevel2'
            label='Take profit level 2'
            type='number'
            size='small'
            fullWidth
          />
        </Grid>
        <Grid item size={6}>
          <TextFieldElement
            name='enterLevel3'
            label='Enter level 3'
            type='number'
            size='small'
            fullWidth
          />
        </Grid>
        <Grid item size={6}>
          <TextFieldElement
            name='takeProfitLevel3'
            label='Take profit level 3'
            type='number'
            size='small'
            fullWidth
          />
        </Grid>
        <Grid item size={12}>
          <TextFieldElement
            name='stopLossLevel'
            label='Stop loss level'
            type='number'
            size='small'
            fullWidth
          />
        </Grid>
        {/* triggerLevel and finishLevel are stored on the settings but
            never read by the engine — derived from enterLevel1/2/3
            instead. Kept in defaults for back-compat with saved
            favorites, hidden here to declutter the form. */}
        <Grid item size={12}>
          <TextFieldElement
            name='minPriceSize'
            label='Min price size'
            type='number'
            size='small'
            fullWidth
          />
        </Grid>
        <Grid item size={12}>
          <TextFieldElement
            name='direction'
            label='Direction'
            type='text'
            size='small'
            fullWidth
          />
        </Grid>
        <Grid item size={12}>
          <TextFieldElement
            name='maxSessionLength'
            label='Max session length'
            type='number'
            size='small'
            fullWidth
          />
        </Grid>
        <Grid item size={12}>
          <DateTsField name='startTs' label='Start date' />
        </Grid>
        <Grid item size={12}>
          <DateTsField name='finishTs' label='Finish date' />
        </Grid>
      </Grid>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
        <Box sx={{ flex: 1 }}>
          <CustomFormButton isLoading={isLoading} value='Run' sx={{ my: 0 }} />
        </Box>
        {showFavorites && (
          <FavoriteToggle favorites={favorites || []} onToggleFavorite={onToggleFavorite} />
        )}
      </Box>
      {resetValues && <ResetButton resetValues={resetValues} />}
    </FormContainer>
  )
}
