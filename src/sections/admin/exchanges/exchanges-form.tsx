import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {boolean, object} from "zod";
import {FormContainer, TextFieldElement, CheckboxElement} from "react-hook-form-mui";
import {Box, Container} from "@mui/material";
import {zodStringSchema} from "@/src/helpers/form-validation.helper";
import CustomFormButton from "@/src/components/custom-form-button/custom-form-button";

export default function ExchangeForm({ defaultValues, isLoading, onSubmit }) {
  const formContext = useForm({
    defaultValues,
    resolver: zodResolver(object({
      name: zodStringSchema(),
      ccxtId: zodStringSchema(),
      apiKey: zodStringSchema().optional(),
      apiSecret: zodStringSchema().optional(),
      password: zodStringSchema().optional(),
      defaultType: zodStringSchema().optional(),
      timeframes: zodStringSchema().optional(),
      testnet: boolean(),
      activated: boolean(),
    })),
  });

  return (
    <FormContainer
      formContext={formContext}
      onSuccess={onSubmit}
    >
      <Container>
        <TextFieldElement
          name='name'
          label='Наименование'
          size='small'
          sx={{ mt: 2 }}
          fullWidth
        />

        <TextFieldElement
          name='ccxtId'
          label='CCXT id (напр. binance, bybit, okx)'
          size='small'
          sx={{ mt: 2 }}
          fullWidth
        />

        <TextFieldElement
          name='apiKey'
          label='API Key'
          size='small'
          sx={{ mt: 2 }}
          fullWidth
        />

        <TextFieldElement
          name='apiSecret'
          label='API Secret'
          type='password'
          size='small'
          sx={{ mt: 2 }}
          fullWidth
        />

        <TextFieldElement
          name='password'
          label='Password / passphrase (если требуется биржей)'
          type='password'
          size='small'
          sx={{ mt: 2 }}
          fullWidth
        />

        <TextFieldElement
          name='defaultType'
          label='Default type (spot, swap, future ...)'
          size='small'
          sx={{ mt: 2 }}
          fullWidth
        />

        <TextFieldElement
          name='timeframes'
          label='Timeframes для klines (через запятую, напр. 5m,15m,1h)'
          size='small'
          sx={{ mt: 2 }}
          fullWidth
        />

        <Box sx={{ mt: 1 }}>
          <CheckboxElement
            name='testnet'
            label='Testnet / sandbox?'
          />
        </Box>

        <Box sx={{ mt: 1 }}>
          <CheckboxElement
            name='activated'
            label='Активна?'
          />
        </Box>

        <CustomFormButton isLoading={isLoading} />
      </Container>
    </FormContainer>
  );
}
