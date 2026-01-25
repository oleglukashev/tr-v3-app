import Iconify from "@/src/components/iconify";
import {MenuItem} from "@mui/material";

export default function CustomDeleteRow({ onMenuClick, title }) {
  return (
    <>
      <MenuItem
        onClick={onMenuClick}
        sx={{ color: 'error.main' }}
      >
        <Iconify icon="solar:trash-bin-trash-bold" />
        {title || 'Удалить'}
      </MenuItem>
    </>
  )
}
