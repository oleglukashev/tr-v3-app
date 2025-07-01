import {FormContainer, SelectElement, TextFieldElement, CheckboxElement} from "react-hook-form-mui";
import {Grid} from "@mui/material";
import CustomFormButton from "@/src/components/custom-form-button/custom-form-button";
import {boolean, object} from "zod";
import {zodNumberSchema, zodStringSchema} from "@/src/helpers/form-validation.helper";
import {zodResolver} from "@hookform/resolvers/zod";

export function StrategiesForm({ defaultValues, onSubmit }: any) {
  return (
    <FormContainer
      defaultValues={defaultValues}
      resolver={zodResolver(object({
        kline1Ts: zodNumberSchema(),
        kline2Ts: zodNumberSchema(),
        status: zodStringSchema(),
        direction: zodStringSchema(),
        confirmed: boolean(),
        pairId: zodNumberSchema(),
        tf: zodNumberSchema(),
        poi1Ts: zodNumberSchema().nullish(),
        poi1High: zodNumberSchema().nullish(),
        poi1Low: zodNumberSchema().nullish(),
        poi2Ts: zodNumberSchema().nullish(),
        poi2High: zodNumberSchema().nullish(),
        poi2Low: zodNumberSchema().nullish(),
        poi3Ts: zodNumberSchema().nullish(),
        poi3High: zodNumberSchema().nullish(),
        poi3Low: zodNumberSchema().nullish(),
      }))}
      onSuccess={onSubmit}
    >
      <Grid container direction='row' spacing={2}>
        <Grid item size={12}>
          <TextFieldElement
            name='kline1Ts'
            label='Kline1 Ts'
            type='number'
            size='small'
            fullWidth
          />
        </Grid>
        <Grid item size={12}>
          <TextFieldElement
            name='kline2Ts'
            label='Kline2 Ts'
            type='number'
            size='small'
            fullWidth
          />
        </Grid>
        <Grid item size={12}>
          <SelectElement
            name='status'
            label='Status'
            options={[
              { id: 'created', label: 'Created'},
              { id: 'waiting', label: 'Waiting'},
              { id: 'finished', label: 'Finished'},
              { id: 'finished_by_lose', label: 'Finished by lose'},
              { id: 'finished_by_size', label: 'Finished by size'},
              { id: 'finished_by_length', label: 'Finished by length'},
              { id: 'triggered', label: 'Triggered'},
            ]}
            size='small'
            fullWidth
          />
        </Grid>
        <Grid item size={12}>
          <SelectElement
            name='direction'
            label='Direction'
            options={[
              { id: 'up', label: 'up'},
              { id: 'down', label: 'down'},
            ]}
            size='small'
            fullWidth
          />
        </Grid>
        <Grid item size={12}>
          <CheckboxElement
            label="Confirmed?"
            name="confirmed"
          />
        </Grid>
        <Grid item size={12}>
          <TextFieldElement
            name='poi1Ts'
            label='POI1 Ts'
            type='number'
            size='small'
            fullWidth
          />
        </Grid>
        <Grid item size={12}>
          <TextFieldElement
            name='poi1High'
            label='POI1 High'
            type='number'
            size='small'
            fullWidth
          />
        </Grid>
        <Grid item size={12}>
          <TextFieldElement
            name='poi1Low'
            label='POI1 Low'
            type='number'
            size='small'
            fullWidth
          />
        </Grid>
        <Grid item size={12}>
          <TextFieldElement
            name='poi2Ts'
            label='POI2 Ts'
            type='number'
            size='small'
            fullWidth
          />
        </Grid>
        <Grid item size={12}>
          <TextFieldElement
            name='poi2High'
            label='POI2 High'
            type='number'
            size='small'
            fullWidth
          />
        </Grid>
        <Grid item size={12}>
          <TextFieldElement
            name='poi2Low'
            label='POI2 Low'
            type='number'
            size='small'
            fullWidth
          />
        </Grid>
        <Grid item size={12}>
          <TextFieldElement
            name='poi3Ts'
            label='POI3 Ts'
            type='number'
            size='small'
            fullWidth
          />
        </Grid>
        <Grid item size={12}>
          <TextFieldElement
            name='poi3High'
            label='POI3 High'
            type='number'
            size='small'
            fullWidth
          />
        </Grid>
        <Grid item size={12}>
          <TextFieldElement
            name='poi3Low'
            label='POI3 Low'
            type='number'
            size='small'
            fullWidth
          />
        </Grid>
      </Grid>
      <CustomFormButton />
    </FormContainer>
  )
}
