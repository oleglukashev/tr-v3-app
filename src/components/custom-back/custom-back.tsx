import Iconify from "@/src/components/iconify";
import {IconButton} from "@mui/material";
import {useRouter} from "next/navigation";

export default function CustomBack({ href, sx }) {
  const router = useRouter();
  return (
    <IconButton onClick={() => router.back()} sx={sx}>
      <Iconify icon="eva:arrow-ios-back-fill" width={16} />
    </IconButton>
  )
}
