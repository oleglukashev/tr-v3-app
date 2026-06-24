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
            <CheckboxElement name='showStrongLevels' label='Показывать сильные уровни (S/R)?' />
            <TextFieldElement
              name='strongLevelsLookback'
              label='S/R: Lookback (баров для свинга)'
              type='number'
              inputProps={{ min: 1, step: 1 }}
              size='small'
              fullWidth
            />
            <TextFieldElement
              name='strongLevelsTolerance'
              label='S/R: Допуск кластеризации (%)'
              type='number'
              inputProps={{ min: 0.01, step: 0.05 }}
              size='small'
              fullWidth
            />
            <TextFieldElement
              name='strongLevelsMinTouches'
              label='S/R: Минимум касаний'
              type='number'
              inputProps={{ min: 1, step: 1 }}
              size='small'
              fullWidth
            />
            <TextFieldElement
              name='strongLevelsMaxCount'
              label='S/R: Макс. количество уровней'
              type='number'
              inputProps={{ min: 1, step: 1 }}
              size='small'
              fullWidth
            />
            <CheckboxElement name='showClusters' label='Показывать кластеры (footprint)?' />
            <CheckboxElement name='showClusterSpike' label='Кластеры: подсветка спайков' />
            <TextFieldElement
              name='clusterSpikeMultiplier'
              label='Кластеры: множитель спайка'
              type='number'
              inputProps={{ min: 1, step: 0.5 }}
              size='small'
              fullWidth
            />
            <CheckboxElement name='showImbalance' label='Подсвечивать разворотные свечи с дисбалансом bid/ask?' />
            <TextFieldElement
              name='imbalanceRatio'
              label='Дисбаланс bid/ask: во сколько раз (N)'
              type='number'
              inputProps={{ min: 1, step: 0.5 }}
              size='small'
              fullWidth
            />
          </Box>
          <CustomFormButton />
        </Container>
      </FormContainer>
    </Box>
  )
}
