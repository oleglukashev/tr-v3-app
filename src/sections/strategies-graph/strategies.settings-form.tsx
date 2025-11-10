import {CheckboxElement, FormContainer, TextFieldElement} from "react-hook-form-mui";
import {FormGroup, Grid} from "@mui/material";
import CustomFormButton from "@/src/components/custom-form-button/custom-form-button";
import {boolean, object} from "zod";
import {zodNumberSchema} from "@/src/helpers/form-validation.helper";
import {zodResolver} from "@hookform/resolvers/zod";
import Container from "@mui/material/Container";

export function StrategiesSettingsForm({ defaultValues, isLoading, onSubmit }: any) {
  return (
    <FormContainer
      defaultValues={defaultValues}
      resolver={zodResolver(object({
        enterLevel1: zodNumberSchema(),
        finishLevel1: zodNumberSchema(),
        enterLevel2: zodNumberSchema().nullish(),
        finishLevel2: zodNumberSchema().nullish(),
        enterLevel3: zodNumberSchema().nullish(),
        finishLevel3: zodNumberSchema().nullish(),
        triggerLevel: zodNumberSchema(),
        exitLevel: zodNumberSchema(),
        minPriceSize: zodNumberSchema(),
        orderSize: zodNumberSchema(),
        useInterceptionFpp1: boolean().nullish(),
        useInterceptionFpp5: boolean().nullish(),
        useInterceptionFpp15: boolean().nullish(),
        useInterceptionFpp30: boolean().nullish(),
        useInterceptionFpp60: boolean().nullish(),
      }))}
      onSuccess={onSubmit}
    >
      <Container>
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
              name='finishLevel1'
              label='Finish level 1'
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
              name='finishLevel2'
              label='Finish level 2'
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
              name='finishLevel3'
              label='Finish level 3'
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
              name='exitLevel'
              label='Exit level'
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
              name='orderSize'
              label='Order size'
              type='number'
              size='small'
              fullWidth
            />
          </Grid>
          <Grid item size={12}>
            <FormGroup>
              <CheckboxElement
                label="Use Interception Fpp 1 minute"
                name="useInterceptionFpp1"
              />
            </FormGroup>
            <FormGroup>
              <CheckboxElement
                label="Use Interception Fpp 5 minutes"
                name="useInterceptionFpp5"
              />
            </FormGroup>
            <FormGroup>
              <CheckboxElement
                label="Use Interception Fpp 15 minutes"
                name="useInterceptionFpp15"
              />
            </FormGroup>
            <FormGroup>
              <CheckboxElement
                label="Use Interception Fpp 30 minutes"
                name="useInterceptionFpp30"
              />
            </FormGroup>
            <FormGroup>
              <CheckboxElement
                label="Use Interception Fpp 60 minutes"
                name="useInterceptionFpp60"
              />
            </FormGroup>
          </Grid>
        </Grid>
        <CustomFormButton isLoading={isLoading} />
      </Container>
    </FormContainer>
  )
}
