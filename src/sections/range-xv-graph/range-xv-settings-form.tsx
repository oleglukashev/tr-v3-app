import { FormContainer, CheckboxElement, TextFieldElement } from "react-hook-form-mui";
import { Box } from "@mui/material";
import Container from "@mui/material/Container";
import CustomFormButton from "@/src/components/custom-form-button/custom-form-button";

export function RangeXvSettingsForm({ defaultValues, onSubmit }: any) {
  return (
    <Box sx={{ p: 2 }}>
      <FormContainer
        defaultValues={defaultValues}
        onSuccess={onSubmit}
      >
        <Container>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 1 }}>
            <TextFieldElement
              name='r'
              label='R (размер бара)'
              size='small'
              fullWidth
            />
            <CheckboxElement name='volumeWidth' label='Ширина по объёму' />
          </Box>
          <CustomFormButton />
        </Container>
      </FormContainer>
    </Box>
  )
}
