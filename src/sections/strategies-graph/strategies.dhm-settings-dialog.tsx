import Box from "@mui/material/Box";
import {StrategiesSettingsForm} from "@/src/sections/strategies-graph/strategies.settings-form";
import {useGetSettingsQuery, useUpdateSettingsMutation} from "@/lib/redux/api/dhmApi";
import {useCallback} from "react";
import {onSubmitWrapper} from "@/src/utils/submit";
import {boolean} from "zod";

export function StrategiesDhmSettingsDialog() {
  const { data: dhmSettings } = useGetSettingsQuery({});
  const [update, { isLoading }] = useUpdateSettingsMutation();

  const onSubmit = useCallback(async (values: any) => {
    return onSubmitWrapper(() => update(values), null, 'Успешно обновлено');
  }, []);

  if (!dhmSettings) {
    return (<></>);
  }

  return (
    <Box sx={{p: 2}}>
      <StrategiesSettingsForm
        defaultValues={{
          enterLevel1: dhmSettings?.data?.enterLevel1,
          finishLevel1: dhmSettings?.data?.finishLevel1,
          enterLevel2: dhmSettings?.data?.enterLevel2,
          finishLevel2: dhmSettings?.data?.finishLevel2,
          enterLevel3: dhmSettings?.data?.enterLevel3,
          finishLevel3: dhmSettings?.data?.finishLevel3,
          triggerLevel: dhmSettings?.data?.triggerLevel,
          exitLevel: dhmSettings?.data?.exitLevel,
          minPriceSize: dhmSettings?.data?.minPriceSize,
          orderSize: dhmSettings?.data?.orderSize,
          useInterceptionFpp1: dhmSettings?.data?.useInterceptionFpp1,
          useInterceptionFpp5: dhmSettings?.data?.useInterceptionFpp5,
          useInterceptionFpp15: dhmSettings?.data?.useInterceptionFpp15,
          useInterceptionFpp30: dhmSettings?.data?.useInterceptionFpp30,
          useInterceptionFpp60: dhmSettings?.data?.useInterceptionFpp60,
        }}
        isLoading={isLoading}
        onSubmit={onSubmit}
      />
    </Box>
  )
}
