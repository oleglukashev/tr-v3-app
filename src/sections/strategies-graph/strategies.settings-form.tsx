import {CheckboxElement, FormContainer, TextFieldElement} from "react-hook-form-mui";
import {FormGroup, Grid, Typography} from "@mui/material";
import CustomFormButton from "@/src/components/custom-form-button/custom-form-button";
import {boolean, object} from "zod";
import {zodNumberSchema, zodStringSchema} from "@/src/helpers/form-validation.helper";
import {zodResolver} from "@hookform/resolvers/zod";
import Container from "@mui/material/Container";

export function StrategiesSettingsForm({ formContext, isLoading, onSuccess }: any) {
  return (
    <FormContainer
      formContext={{
        ...formContext,
        resolver: zodResolver(object({
          enterLevel1: zodNumberSchema(),
          takeProfitLevel1: zodNumberSchema(),
          enterLevel2: zodNumberSchema().nullish(),
          takeProfitLevel2: zodNumberSchema().nullish(),
          enterLevel3: zodNumberSchema().nullish(),
          takeProfitLevel3: zodNumberSchema().nullish(),
          triggerLevel: zodNumberSchema().nullish(),
          finishLevel: zodNumberSchema().nullish(),
          stopLossLevel: zodNumberSchema(),
          minPriceSize: zodNumberSchema(),
          orderSize: zodNumberSchema(),
          direction: zodStringSchema().nullish(),
          // useInterceptionFpp1: boolean().nullish(),
          // useInterceptionFpp5: boolean().nullish(),
          // useInterceptionFpp15: boolean().nullish(),
          // useInterceptionFpp30: boolean().nullish(),
          // useInterceptionFpp60: boolean().nullish(),
        }))
      }}
      onSuccess={onSuccess}
    >
      <Container>
        <Typography>Orders</Typography>
        <Grid container direction='row' spacing={2} sx={{ mb: 1 }}>
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
              label='Take profit 1'
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
              label='Take profit 2'
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
              label='Take profit 3'
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
        </Grid>
        <Typography>Range settings</Typography>
        <Grid container direction='row' spacing={2} sx={{ mb: 1 }}>
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
              name='finishLevel'
              label='Finish level'
              type='number'
              size='small'
              fullWidth
            />
          </Grid>
        </Grid>
        <Typography>Range settings</Typography>
        <Grid container direction='row' spacing={2}>
          <Grid item size={12}>
            <TextFieldElement
              name='minPriceSize'
              label='Min price size (%)'
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
            <TextFieldElement
              name='direction'
              label='Direction'
              type='text'
              size='small'
              fullWidth
            />
          </Grid>
          {/*<Grid item size={12}>*/}
          {/*  <FormGroup>*/}
          {/*    <CheckboxElement*/}
          {/*      label="Use Interception Fpp 1 minute"*/}
          {/*      name="useInterceptionFpp1"*/}
          {/*    />*/}
          {/*  </FormGroup>*/}
          {/*  <FormGroup>*/}
          {/*    <CheckboxElement*/}
          {/*      label="Use Interception Fpp 5 minutes"*/}
          {/*      name="useInterceptionFpp5"*/}
          {/*    />*/}
          {/*  </FormGroup>*/}
          {/*  <FormGroup>*/}
          {/*    <CheckboxElement*/}
          {/*      label="Use Interception Fpp 15 minutes"*/}
          {/*      name="useInterceptionFpp15"*/}
          {/*    />*/}
          {/*  </FormGroup>*/}
          {/*  <FormGroup>*/}
          {/*    <CheckboxElement*/}
          {/*      label="Use Interception Fpp 30 minutes"*/}
          {/*      name="useInterceptionFpp30"*/}
          {/*    />*/}
          {/*  </FormGroup>*/}
          {/*  <FormGroup>*/}
          {/*    <CheckboxElement*/}
          {/*      label="Use Interception Fpp 60 minutes"*/}
          {/*      name="useInterceptionFpp60"*/}
          {/*    />*/}
          {/*  </FormGroup>*/}
          {/*</Grid>*/}
        </Grid>
        <CustomFormButton isLoading={isLoading} />
      </Container>
    </FormContainer>
  )
}
