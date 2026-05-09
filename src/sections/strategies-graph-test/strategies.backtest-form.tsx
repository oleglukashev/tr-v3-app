import {FormContainer, TextFieldElement} from "react-hook-form-mui";
import {Box, Button, Grid, IconButton, TextField, Tooltip} from "@mui/material";
import CustomFormButton from "@/src/components/custom-form-button/custom-form-button";
import {object} from "zod";
import {zodNumberSchema, zodStringSchema} from "@/src/helpers/form-validation.helper";
import {zodResolver} from "@hookform/resolvers/zod";
import {Controller, useFormContext, useWatch} from "react-hook-form";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import moment from "moment";

const FAVORITE_MATCH_KEYS = [
  'enterLevel1', 'enterLevel2', 'enterLevel3',
  'takeProfitLevel1', 'takeProfitLevel2', 'takeProfitLevel3',
  'triggerLevel', 'stopLossLevel', 'finishLevel',
  'minPriceSize', 'direction', 'maxSessionLength',
  'startTs', 'finishTs',
] as const;

function favoritesMatch(a: any, b: any): boolean {
  for (const k of FAVORITE_MATCH_KEYS) {
    if (String(a?.[k] ?? '') !== String(b?.[k] ?? '')) return false;
  }
  return true;
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
        triggerLevel: zodNumberSchema(),
        stopLossLevel: zodNumberSchema(),
        finishLevel: zodNumberSchema(),
        minPriceSize: zodNumberSchema(),
        direction: zodStringSchema().nullish(),
        maxSessionLength: zodNumberSchema(),
        startTs: zodNumberSchema(),
        finishTs: zodNumberSchema().nullish(),
      }))}
      onSuccess={onSubmit}
    >
      <Grid container direction='row' spacing={2}>
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
            name='triggerLevel'
            label='Trigger level'
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
        <Grid item size={12}>
          <TextFieldElement
            name='finishLevel'
            label='Finish level'
            type='number'
            size='small'
            fullWidth
          />
        </Grid>
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
