import Box from "@mui/material/Box";
import Label from "@/src/components/label";

export function StrategiesDhmKlineFppsDialog({ fpp }: any) {
  return (
    <Box sx={{ p: 2 }}>
      {fpp.map((item: any, index: number) => (
        <Box key={index}>
          <Label color='success'>{item.type}</Label>
        </Box>
      ))}
    </Box>
  )
}
