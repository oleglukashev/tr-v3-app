import {CheckboxElement, FormContainer, TextFieldElement} from "react-hook-form-mui";
import {FormGroup, Grid} from "@mui/material";
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
            name='finishTs'
            label='Finish ts'
            type='number'
            size='small'
            fullWidth
          />
        </Grid>
      </Grid>
      <CustomFormButton isLoading={isLoading} value='Run' />
    </FormContainer>
  )
}
