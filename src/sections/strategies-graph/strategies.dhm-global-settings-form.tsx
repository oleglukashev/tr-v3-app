import {FormContainer, MultiSelectElement, CheckboxElement, useFormContext} from "react-hook-form-mui";
import {Grid, Checkbox, FormControlLabel, Box, Typography} from "@mui/material";
import CustomFormButton from "@/src/components/custom-form-button/custom-form-button";
import Container from "@mui/material/Container";

const DHM_STATUSES = [
  { id: 'created', label: 'Created' },
  { id: 'waiting', label: 'Waiting' },
  { id: 'triggered', label: 'Triggered' },
  { id: 'finished', label: 'Finished' },
  { id: 'finished_by_lose', label: 'Finished by lose' },
  { id: 'finished_by_size', label: 'Finished by size' },
];

function DhmStatusCheckboxes() {
  const { setValue, watch } = useFormContext();
  const dhmVisibleStatuses: string[] = watch('dhmVisibleStatuses') || [];

  const allChecked = DHM_STATUSES.every(s => dhmVisibleStatuses.includes(s.id));
  const someChecked = DHM_STATUSES.some(s => dhmVisibleStatuses.includes(s.id));

  const handleMasterChange = (checked: boolean) => {
    setValue('dhmVisibleStatuses', checked ? DHM_STATUSES.map(s => s.id) : [], { shouldDirty: true });
  };

  const handleStatusChange = (statusId: string, checked: boolean) => {
    const next = checked
      ? [...dhmVisibleStatuses, statusId]
      : dhmVisibleStatuses.filter(s => s !== statusId);
    setValue('dhmVisibleStatuses', next, { shouldDirty: true });
  };

  return (
    <Box>
      <FormControlLabel
        label={<Typography variant="body2" fontWeight="bold">Показывать DHM сессии</Typography>}
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
        {DHM_STATUSES.map(status => (
          <FormControlLabel
            key={status.id}
            label={<Typography variant="body2">{status.label}</Typography>}
            control={
              <Checkbox
                size="small"
                checked={dhmVisibleStatuses.includes(status.id)}
                onChange={(e) => handleStatusChange(status.id, e.target.checked)}
              />
            }
          />
        ))}
      </Box>
    </Box>
  );
}

export function StrategiesDhmGlobalSettingsForm({ defaultValues, onSubmit }: any) {
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
            <CheckboxElement name='showDrawingElements' label='Показывать элементы рисования?' />
          </Grid>
          <Grid item size={12}>
            <DhmStatusCheckboxes />
          </Grid>
        </Grid>
        <CustomFormButton />
      </Container>
    </FormContainer>
  )
}
