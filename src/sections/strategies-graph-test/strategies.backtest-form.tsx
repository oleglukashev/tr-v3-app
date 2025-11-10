import {FormContainer, TextFieldElement} from "react-hook-form-mui";
import {Grid} from "@mui/material";
import CustomFormButton from "@/src/components/custom-form-button/custom-form-button";
import {object} from "zod";
import {zodNumberSchema, zodStringSchema} from "@/src/helpers/form-validation.helper";
import {zodResolver} from "@hookform/resolvers/zod";

export function StrategiesBacktestForm({ defaultValues, isLoading, onSubmit }: any) {
  return (
    <FormContainer
      defaultValues={defaultValues}
      resolver={zodResolver(object({
        pairId: zodNumberSchema(),
        tf: zodNumberSchema(),
        exitLevel: zodStringSchema(),
        maxSessionLength: zodNumberSchema(),
        minPriceSize: zodNumberSchema(),
        startTs: zodNumberSchema(),
        direction: zodStringSchema().nullish(),
      }))}
      onSuccess={onSubmit}
    >
      <Grid container direction='row' spacing={2}>
        <Grid item size={12}>
          <TextFieldElement
            name='exitLevel'
            label='Exit level'
            type='string'
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
          <TextFieldElement
            name='minPriceSize'
            label='Min price lesizength'
            type='number'
            size='small'
            fullWidth
          />
        </Grid>
        <Grid item size={12}>
          <TextFieldElement
            name='startTs'
            label='Start ts'
            type='number'
            size='small'
            fullWidth
          />
        </Grid>
        <Grid item size={12}>
          <TextFieldElement
            name='direction'
            label='Direction'
            size='small'
            fullWidth
          />
        </Grid>
      </Grid>
      <CustomFormButton isLoading={isLoading} value='Run' />
    </FormContainer>
  )
}
