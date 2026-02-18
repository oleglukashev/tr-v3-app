import Box from "@mui/material/Box";
import {StrategiesDhmGlobalSettingsForm} from "@/src/sections/strategies-graph/strategies.dhm-global-settings-form";

export function StrategiesDhmFppFiltersDialog({ settings, onSubmit }: any) {
  return (
    <Box sx={{ p: 2 }}>
      <StrategiesDhmGlobalSettingsForm
        defaultValues={settings}
        onSubmit={onSubmit}
      />
    </Box>
  )
}
