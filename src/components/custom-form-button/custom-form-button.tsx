import {LoadingButton} from "@mui/lab";

const CustomFormButton = ({ isLoading, value, sx, size }: any) => {
  return (
    <LoadingButton
      fullWidth
      color="inherit"
      size={size || "large"}
      type="submit"
      variant="contained"
      loading={isLoading}
      sx={sx || {my: 2}}
    >
      {value || 'Save'}
    </LoadingButton>
  )
}

export default CustomFormButton;
