import {FormContainer, MultiSelectElement, CheckboxElement} from "react-hook-form-mui";
import {Grid, Divider, Box} from "@mui/material";
import CustomFormButton from "@/src/components/custom-form-button/custom-form-button";
import Container from "@mui/material/Container";

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
                    maxHeight: 1000, // устанавливаем большую высоту, чтобы избежать скролла
                  },
                },
              }}
              options={[
                { id: 'interception', label: 'Interception' },
                { id: 'reverse', label: 'Reverse' },
                { id: 'locked_volume', label: 'Locked volume' },
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
            <CheckboxElement name='fppCombine' label='Combine' />
          </Grid>
          <Box>
            <CheckboxElement name='showLiquidity' label='Показывать ликвидность?' />
          </Box>
          <Divider />
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
                    maxHeight: 1000, // устанавливаем большую высоту, чтобы избежать скролла
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
        </Grid>
        <CustomFormButton />
      </Container>
    </FormContainer>
  )
}
