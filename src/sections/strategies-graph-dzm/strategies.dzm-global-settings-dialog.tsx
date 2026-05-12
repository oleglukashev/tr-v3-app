import Box from "@mui/material/Box";
import {StrategiesDzmGlobalSettingsForm} from "@/src/sections/strategies-graph-dzm/strategies.dzm-global-settings-form";

export function StrategiesDzmFppFiltersDialog({ settings, onSubmit }: any) {
  return (
    <Box sx={{ p: 2 }}>
      <StrategiesDzmGlobalSettingsForm
        defaultValues={settings}
        onSubmit={onSubmit}
      />
    </Box>
  )
}
