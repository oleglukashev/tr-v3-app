import {FormContainer, MultiSelectElement} from "react-hook-form-mui";
import {Grid} from "@mui/material";
import CustomFormButton from "@/src/components/custom-form-button/custom-form-button";
import Container from "@mui/material/Container";

export function StrategiesFppFiltersForm({ defaultValues, onSubmit }: any) {
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
              options={[
                { id: 'interception', label: 'Interception' },
                { id: 'reverse', label: 'Reverse' },
                { id: 'locked_volume', label: 'Locked volume' },
                { id: 'locked_delta', label: 'Locked delta' },
                { id: 'locked_imbalance', label: 'Locked imbalance' },
                { id: 'test_volume', label: 'Test Volume' },
                { id: 'low_last_price_volume', label: 'Low last price volume' }
              ]}
            />
          </Grid>
        </Grid>
        <CustomFormButton />
      </Container>
    </FormContainer>
  )
}
