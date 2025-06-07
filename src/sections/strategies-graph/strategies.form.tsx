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
        low: zodNumberSchema(true),
        high: zodNumberSchema(true),
        status: zodStringSchema(),
        direction: zodStringSchema(),
        confirmed: boolean(),
        pairId: zodNumberSchema(),
        tf: zodNumberSchema(),
      }))}
      onSuccess={onSubmit}
    >
      <Grid container direction='row' spacing={2}>
        <Grid item size={12}>
          <TextFieldElement
            name='kline1Ts'
            label='Kline Ts'
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
        <Grid item size={6}>
          <TextFieldElement
            name='low'
            label='Low'
            type='number'
            size='small'
            fullWidth
          />
        </Grid>
        <Grid item size={6}>
          <TextFieldElement
            name='high'
            label='High'
            type='number'
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
      </Grid>
      <CustomFormButton />
    </FormContainer>
  )
}
