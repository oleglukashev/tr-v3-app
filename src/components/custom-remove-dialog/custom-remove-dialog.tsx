import {Button, DialogContent, Typography} from "@mui/material";
import CustomDialog from "@/src/components/custom-dialog/custom-dialog";

export default function CustomRemoveDialog({ open, onClose, onConfirm }) {
  return (
    <CustomDialog
      open={open}
      onClose={onClose}
      title='Удаление'
      content={(
        <DialogContent>
          <Typography>Вы уверены?</Typography>
        </DialogContent>
      )}
      actions={(
        <>
          <Button onClick={onClose}>Отмена</Button>
          <Button onClick={onConfirm} autoFocus>Да</Button>
        </>
      )}
    />
  )
}
