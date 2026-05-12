import Box from "@mui/material/Box";
import {StrategiesSettingsForm} from "@/src/sections/strategies-graph-dzm/strategies.settings-form";
import {useUpdateSettingsDzmMutation} from "@/lib/redux/api/dzmApi";
import {useCallback, useEffect} from "react";
import {onSubmitWrapper} from "@/src/utils/submit";
import {useForm} from "react-hook-form";

export function StrategiesDzmSettingsDialog({ dzmSettings, tf, pairId }: any) {
  const [update, { isLoading }] = useUpdateSettingsDzmMutation();

  const context = useForm({
    defaultValues: {
      enterLevel1: dzmSettings?.data?.enterLevel1,
      takeProfitLevel1: dzmSettings?.data?.takeProfitLevel1,
      enterLevel2: dzmSettings?.data?.enterLevel2,
      takeProfitLevel2: dzmSettings?.data?.takeProfitLevel2,
      enterLevel3: dzmSettings?.data?.enterLevel3,
      takeProfitLevel3: dzmSettings?.data?.takeProfitLevel3,
      triggerLevel: dzmSettings?.data?.triggerLevel,
      finishLevel: dzmSettings?.data?.finishLevel,
      stopLossLevel: dzmSettings?.data?.stopLossLevel,
      minPriceSize: dzmSettings?.data?.minPriceSize,
      orderSize: dzmSettings?.data?.orderSize,
      direction: dzmSettings?.data?.direction,
      // useInterceptionFpp1: dzmSettings?.data?.useInterceptionFpp1,
      // useInterceptionFpp5: dzmSettings?.data?.useInterceptionFpp5,
      // useInterceptionFpp15: dzmSettings?.data?.useInterceptionFpp15,
      // useInterceptionFpp30: dzmSettings?.data?.useInterceptionFpp30,
      // useInterceptionFpp60: dzmSettings?.data?.useInterceptionFpp60,
    },
  });

  const { reset, watch } = context;

  useEffect(() => {
    reset({
      enterLevel1: dzmSettings?.data?.enterLevel1,
      takeProfitLevel1: dzmSettings?.data?.takeProfitLevel1,
      enterLevel2: dzmSettings?.data?.enterLevel2,
      takeProfitLevel2: dzmSettings?.data?.takeProfitLevel2,
      enterLevel3: dzmSettings?.data?.enterLevel3,
      takeProfitLevel3: dzmSettings?.data?.takeProfitLevel3,
      triggerLevel: dzmSettings?.data?.triggerLevel,
      finishLevel: dzmSettings?.data?.finishLevel,
      stopLossLevel: dzmSettings?.data?.stopLossLevel,
      minPriceSize: dzmSettings?.data?.minPriceSize,
      orderSize: dzmSettings?.data?.orderSize,
      direction: dzmSettings?.data?.direction,
      // useInterceptionFpp1: dzmSettings?.data?.useInterceptionFpp1,
      // useInterceptionFpp5: dzmSettings?.data?.useInterceptionFpp5,
      // useInterceptionFpp15: dzmSettings?.data?.useInterceptionFpp15,
      // useInterceptionFpp30: dzmSettings?.data?.useInterceptionFpp30,
      // useInterceptionFpp60: dzmSettings?.data?.useInterceptionFpp60,
    })
  }, [dzmSettings, reset]);

  const onSubmit = useCallback(async (values: any) => {
    const data: any = {
      data: values,
      tf: parseInt(tf),
      pairId: parseInt(pairId),
    }
    return onSubmitWrapper(() => update(data), null, 'Успешно обновлено');
  }, [tf, pairId, update]);

  // if (!dzmSettings) {
  //   return (<></>);
  // }

  return (
    <Box sx={{p: 2}}>
      <StrategiesSettingsForm
        formContext={context}
        isLoading={isLoading}
        onSuccess={onSubmit}
      />
    </Box>
  )
}
