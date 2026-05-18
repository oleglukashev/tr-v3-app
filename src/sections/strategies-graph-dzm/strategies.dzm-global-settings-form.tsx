import {FormContainer, MultiSelectElement, CheckboxElement, TextFieldElement, useFormContext} from "react-hook-form-mui";
import {Grid, Checkbox, FormControlLabel, Box, Typography} from "@mui/material";
import CustomFormButton from "@/src/components/custom-form-button/custom-form-button";
import Container from "@mui/material/Container";

const DZM_STATUSES = [
  { id: 'created', label: 'Created' },
  { id: 'waiting', label: 'Waiting' },
  { id: 'triggered', label: 'Triggered' },
  { id: 'finished', label: 'Finished' },
  { id: 'finished_by_lose', label: 'Finished by lose' },
  { id: 'finished_by_size', label: 'Finished by size' },
];

function DzmStatusCheckboxes() {
  const { setValue, watch } = useFormContext();
  const dzmVisibleStatuses: string[] = watch('dzmVisibleStatuses') || [];

  const allChecked = DZM_STATUSES.every(s => dzmVisibleStatuses.includes(s.id));
  const someChecked = DZM_STATUSES.some(s => dzmVisibleStatuses.includes(s.id));

  const handleMasterChange = (checked: boolean) => {
    setValue('dzmVisibleStatuses', checked ? DZM_STATUSES.map(s => s.id) : [], { shouldDirty: true });
  };

  const handleStatusChange = (statusId: string, checked: boolean) => {
    const next = checked
      ? [...dzmVisibleStatuses, statusId]
      : dzmVisibleStatuses.filter(s => s !== statusId);
    setValue('dzmVisibleStatuses', next, { shouldDirty: true });
  };

  return (
    <Box>
      <FormControlLabel
        label={<Typography variant="body2" fontWeight="bold">Показывать DZM сессии</Typography>}
        control={
          <Checkbox
            size="small"
            checked={allChecked}
            indeterminate={someChecked && !allChecked}
            onChange={(e) => handleMasterChange(e.target.checked)}
          />
        }
      />
      <Box sx={{ pl: 3, display: 'flex', flexDirection: 'column' }}>
        {DZM_STATUSES.map(status => (
          <FormControlLabel
            key={status.id}
            label={<Typography variant="body2">{status.label}</Typography>}
            control={
              <Checkbox
                size="small"
                checked={dzmVisibleStatuses.includes(status.id)}
                onChange={(e) => handleStatusChange(status.id, e.target.checked)}
              />
            }
          />
        ))}
      </Box>
    </Box>
  );
}

export function StrategiesDzmGlobalSettingsForm({ defaultValues, onSubmit }: any) {
  return (
    <FormContainer
      defaultValues={defaultValues}
      onSuccess={onSubmit}
    >
      <Container>
        <Grid container direction='row' spacing={2}>
          <Grid item size={12}>
            <MultiSelectElement
              name='fppFilters'
              fullWidth={true}
              showCheckbox
              size='small'
              label='Fpp Filters'
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 1000,
                  },
                },
              }}
              options={[
                { id: 'interception', label: 'Interception' },
                { id: 'reverse', label: 'Reverse' },
                { id: 'locked_volume', label: 'Locked volume' },
                { id: 'weak_locked_volume', label: 'Weak locked volume' },
                { id: 'locked_delta', label: 'Locked delta' },
                { id: 'locked_imbalance', label: 'Locked imbalance' },
                { id: 'test_volume', label: 'Test Volume' },
                { id: 'resistance', label: 'Resistance' },
                { id: 'weakness', label: 'Weakness' },
                { id: 'low_last_price_volume', label: 'Low last price volume' }
              ]}
            />
          </Grid>
          <Grid item size={12}>
            <MultiSelectElement
              name='statusFilters'
              fullWidth={true}
              showCheckbox
              size='small'
              label='Status Filters'
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 1000,
                  },
                },
              }}
              options={[
                { id: 'created', label: 'Created' },
                { id: 'waiting', label: 'Waiting' },
                { id: 'triggered', label: 'Triggered' },
                { id: 'finished', label: 'Finished' },
                { id: 'finished_by_size', label: 'Finished by size' },
                { id: 'finished_by_lose', label: 'Finished by lose' },
                { id: 'finished_by_trend_finish', label: 'Finished by trend finish' }
              ]}
            />
          </Grid>
          <Grid item size={12}>
            <CheckboxElement name='fppCombine' label='Combine' />
          </Grid>
          <Grid item size={12}>
            <CheckboxElement name='showLiquidity' label='Показывать ликвидность?' />
          </Grid>
          <Grid item size={12}>
            <CheckboxElement name='showBidasks' label='Показывать bidasks' />
          </Grid>
          <Grid item size={12}>
            <CheckboxElement name='showSessions' label='Показывать сессии?' />
          </Grid>
          <Grid item size={12}>
            <CheckboxElement name='showVolume' label='Показывать объем?' />
          </Grid>
          <Grid item size={12}>
            <CheckboxElement name='showZigzag' label='Показывать ZigZag?' />
          </Grid>
          <Grid item size={12}>
            <CheckboxElement name='showClusterSpike' label='Показывать кластерные выбросы объёма?' />
          </Grid>
          <Grid item size={12}>
            <TextFieldElement
              name='clusterSpikeMultiplier'
              label='Кратность выброса (x медианы)'
              type='number'
              inputProps={{ min: 1, step: 0.5 }}
              size='small'
              fullWidth
            />
          </Grid>
          <Grid item size={12}>
            <CheckboxElement name='showDrawingElements' label='Показывать элементы рисования?' />
          </Grid>
          <Grid item size={12}>
            <DzmStatusCheckboxes />
          </Grid>
        </Grid>
        <CustomFormButton />
      </Container>
    </FormContainer>
  )
}
