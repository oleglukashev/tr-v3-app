import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {boolean, object} from "zod";
import {FormContainer, TextFieldElement, CheckboxElement, TextareaAutosizeElement} from "react-hook-form-mui";
import {Box, Container} from "@mui/material";
import {
  zodNumberSchema,
  zodStringSchema
} from "@/src/helpers/form-validation.helper";
import CustomFormButton from "@/src/components/custom-form-button/custom-form-button";

export default function PairForm({ defaultValues, isLoading, onSubmit }) {
  const formContext = useForm({
    defaultValues,
    resolver: zodResolver(object({
      name: zodStringSchema(),
      symbol: zodStringSchema(),
      currentTs: zodNumberSchema(),
      startTs: zodNumberSchema(),
      tradingServiceId: zodNumberSchema(),
      precision: zodNumberSchema(),
      activated: boolean(),
      isDhm: boolean(),
      isUsedToKline: boolean(),
      isUsedToBidasks: boolean(),
      tickerAnswerSymbol: zodStringSchema(),
      clusterPrecision: zodStringSchema(),
      xvR: zodStringSchema().optional(),
    })),
  });

  return (
    <>
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
            name='symbol'
            label='Символ'
            size='small'
            sx={{ mt: 2 }}
            fullWidth
          />

          <TextFieldElement
            name='currentTs'
            label='Текущий timestamp'
            type='number'
            size='small'
            sx={{ mt: 2 }}
            fullWidth
          />

          <TextFieldElement
            name='startTs'
            label='Начальный timestamp'
            type='number'
            size='small'
            sx={{ mt: 2 }}
            fullWidth
          />

          <TextFieldElement
            name='tradingServiceId'
            label='Trading Service Id'
            type='number'
            size='small'
            sx={{ mt: 2 }}
            fullWidth
          />

          <TextFieldElement
            name='precision'
            label='Кол-во чисел после запятой'
            type='number'
            size='small'
            sx={{ mt: 2 }}
            fullWidth
          />

          <Box sx={{ mt: 1 }}>
            <CheckboxElement
              name='activated'
              label='Активен?'
            />
          </Box>

          <Box sx={{ mt: 1 }}>
            <CheckboxElement
              name='isDhm'
              label='DHM/DZM стратегии?'
            />
          </Box>

          <Box sx={{ mt: 1 }}>
            <CheckboxElement
              name='isUsedToKline'
              label='Используется для klines?'
            />
          </Box>

          <Box sx={{ mt: 1 }}>
            <CheckboxElement
              name='isUsedToBidasks'
              label='Используется для bidasks?'
            />
          </Box>

          <TextFieldElement
            name='tickerAnswerSymbol'
            label='Символ для возвращенных данных по api'
            size='small'
            sx={{ mt: 2 }}
            fullWidth
          />

          <TextareaAutosizeElement
            name='clusterPrecision'
            label='Сluster precision'
            size='small'
            rows={7}
            sx={{ mt: 2 }}
            fullWidth
          />

          <TextFieldElement
            name='xvR'
            label='Range XV размеры (через запятую, напр. 100,200)'
            size='small'
            sx={{ mt: 2 }}
            fullWidth
          />

          <CustomFormButton isLoading={isLoading} />
        </Container>
      </FormContainer>
    </>
  );
}
