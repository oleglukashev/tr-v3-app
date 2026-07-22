import { FormContainer, CheckboxElement, TextFieldElement, SelectElement } from "react-hook-form-mui";
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
            <CheckboxElement name='showRsi' label='Показывать RSI?' />
            <TextFieldElement
              name='rsiPeriod'
              label='RSI: Период'
              type='number'
              inputProps={{ min: 2, step: 1 }}
              size='small'
              fullWidth
            />
            <CheckboxElement name='showDelta' label='Показывать дельту (footprint, Δ bid/ask)?' />
            <CheckboxElement name='showLiquidations' label='Показывать ликвидации (Σ контрактов по уровням слева от футпринта)?' />
            <CheckboxElement name='showSweeps' label='Показывать sweeps (крупный игрок, счётчик по уровням справа от футпринта)?' />
            <TextFieldElement
              name='sweepMinLevels'
              label='Sweeps: мин. уровней (0 = все)'
              type='number'
              inputProps={{ min: 0, step: 1 }}
              size='small'
              fullWidth
            />
            <TextFieldElement
              name='sweepMinAmount'
              label='Sweeps: мин. объём USD (quoteVolume, 0 = все)'
              type='number'
              inputProps={{ min: 0, step: 1 }}
              size='small'
              fullWidth
            />
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
            <CheckboxElement name='showReversal' label='Подсвечивать разворотные свечи (по футпринту)?' />
            <CheckboxElement name='showImbalance' label='— Фильтр: дисбаланс bid/ask' />
            <TextFieldElement
              name='imbalanceRatio'
              label='Дисбаланс bid/ask: во сколько раз (N)'
              type='number'
              inputProps={{ min: 1, step: 0.5 }}
              size='small'
              fullWidth
            />
            <SelectElement
              name='imbalanceSide'
              label='Дисбаланс: относительно тренда разворота'
              options={[
                { id: '', label: 'Любой тренд' },
                { id: 'trend', label: 'По тренду разворотной свечи' },
                { id: 'counter', label: 'Против тренда разворотной свечи' },
              ]}
              size='small'
              fullWidth
            />
            <CheckboxElement name='showStacked' label='— Фильтр: стопка дисбалансов' />
            <TextFieldElement
              name='stackedRunN'
              label='Стопка: уровней подряд (N)'
              type='number'
              inputProps={{ min: 1, step: 1 }}
              size='small'
              fullWidth
            />
            <TextFieldElement
              name='stackedRatioM'
              label='Стопка: мин. разница покупки−продажи на уровне (объём, M)'
              type='number'
              inputProps={{ min: 0, step: 1 }}
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
