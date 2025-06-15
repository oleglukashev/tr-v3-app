import Box from "@mui/material/Box";
import {StrategiesFppFiltersForm} from "@/src/sections/strategies-graph/strategies.fpp-filters-form";

export function StrategiesDhmFppFiltersDialog({ fppFilters, onSubmit }: any) {
  return (
    <Box sx={{ p: 2 }}>
      <StrategiesFppFiltersForm
        defaultValues={{
          fppFilters: fppFilters,
        }}
        onSubmit={onSubmit}
      />
    </Box>
  )
}
