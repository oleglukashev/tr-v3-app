import Box from "@mui/material/Box";
import {StrategiesDhmGlobalSettingsForm} from "@/src/sections/strategies-graph/strategies.dhm-global-settings-form";

export function StrategiesDhmFppFiltersDialog({ fppFilters, onSubmit }: any) {
  return (
    <Box sx={{ p: 2 }}>
      <StrategiesDhmGlobalSettingsForm
        defaultValues={{
          fppFilters: fppFilters,
          statusFilters: [],
          fppCombine: false,
        }}
        onSubmit={onSubmit}
      />
    </Box>
  )
}
