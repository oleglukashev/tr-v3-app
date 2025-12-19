import Box from "@mui/material/Box";
import {StrategiesSettingsForm} from "@/src/sections/strategies-graph/strategies.settings-form";
import {useGetSettingsByPairIdAndTfQuery, useUpdateSettingsMutation} from "@/lib/redux/api/dhmApi";
import {useCallback, useEffect} from "react";
import {onSubmitWrapper} from "@/src/utils/submit";
import {useForm} from "react-hook-form";

export function StrategiesDhmSettingsDialog({ tf, pairId }: any) {
  const { data: dhmSettings } = useGetSettingsByPairIdAndTfQuery({ tf, pairId });
  const [update, { isLoading }] = useUpdateSettingsMutation();

  const context = useForm({
    defaultValues: {
      enterLevel1: dhmSettings?.data?.enterLevel1,
      takeProfitLevel1: dhmSettings?.data?.takeProfitLevel1,
      enterLevel2: dhmSettings?.data?.enterLevel2,
      takeProfitLevel2: dhmSettings?.data?.takeProfitLevel2,
      enterLevel3: dhmSettings?.data?.enterLevel3,
      takeProfitLevel3: dhmSettings?.data?.takeProfitLevel3,
      triggerLevel: dhmSettings?.data?.triggerLevel,
      finishLevel: dhmSettings?.data?.finishLevel,
      stopLossLevel: dhmSettings?.data?.stopLossLevel,
      minPriceSize: dhmSettings?.data?.minPriceSize,
      orderSize: dhmSettings?.data?.orderSize,
      direction: dhmSettings?.data?.direction,
      // useInterceptionFpp1: dhmSettings?.data?.useInterceptionFpp1,
      // useInterceptionFpp5: dhmSettings?.data?.useInterceptionFpp5,
      // useInterceptionFpp15: dhmSettings?.data?.useInterceptionFpp15,
      // useInterceptionFpp30: dhmSettings?.data?.useInterceptionFpp30,
      // useInterceptionFpp60: dhmSettings?.data?.useInterceptionFpp60,
    },
  });

  const { reset, watch } = context;

  useEffect(() => {
    reset({
      enterLevel1: dhmSettings?.data?.enterLevel1,
      takeProfitLevel1: dhmSettings?.data?.takeProfitLevel1,
      enterLevel2: dhmSettings?.data?.enterLevel2,
      takeProfitLevel2: dhmSettings?.data?.takeProfitLevel2,
      enterLevel3: dhmSettings?.data?.enterLevel3,
      takeProfitLevel3: dhmSettings?.data?.takeProfitLevel3,
      triggerLevel: dhmSettings?.data?.triggerLevel,
      finishLevel: dhmSettings?.data?.finishLevel,
      stopLossLevel: dhmSettings?.data?.stopLossLevel,
      minPriceSize: dhmSettings?.data?.minPriceSize,
      orderSize: dhmSettings?.data?.orderSize,
      direction: dhmSettings?.data?.direction,
      // useInterceptionFpp1: dhmSettings?.data?.useInterceptionFpp1,
      // useInterceptionFpp5: dhmSettings?.data?.useInterceptionFpp5,
      // useInterceptionFpp15: dhmSettings?.data?.useInterceptionFpp15,
      // useInterceptionFpp30: dhmSettings?.data?.useInterceptionFpp30,
      // useInterceptionFpp60: dhmSettings?.data?.useInterceptionFpp60,
    })
  }, [dhmSettings, reset]);

  const onSubmit = useCallback(async (values: any) => {
    const data: any = {
      data: values,
      tf: parseInt(tf),
      pairId: parseInt(pairId),
    }
    return onSubmitWrapper(() => update(data), null, 'Успешно обновлено');
  }, [tf, pairId, update]);

  // if (!dhmSettings) {
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
