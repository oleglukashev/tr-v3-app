import Iconify from "@/src/components/iconify";
import {MenuItem} from "@mui/material";

export default function CustomEditRow({ onMenuClick, title }) {
  return (
    <>
      <MenuItem
        onClick={onMenuClick}
      >
        <Iconify icon="solar:pen-new-square-linear" />
        {title || 'Редактировать'}
      </MenuItem>
    </>
  )
}
