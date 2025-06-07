import {useTheme} from "@mui/material/styles";
import {Dialog, DialogActions, DialogTitle} from "@mui/material";

export default function CustomDialog({
  title,
  content,
  actions,
  open,
  onClose,
  maxWidth,
 }) {
  return (
    <Dialog
      fullWidth
      maxWidth={maxWidth || "sm"}
      open={open}
      onClose={onClose}
      transitionDuration={{
        enter: (new useTheme()).transitions.duration.shortest,
        exit: (new useTheme()).transitions.duration.shortest - 80,
      }}
    >
      <DialogTitle>{title}</DialogTitle>
      {content}
      {!!actions && (
        <DialogActions>
          {actions}
        </DialogActions>
      )}
    </Dialog>
  )
}
