import {useForm} from "react-hook-form";
import {TextFieldElement,FormContainer} from 'react-hook-form-mui';
import {InputAdornment} from "@mui/material";
import Iconify from "@/src/components/iconify";

export default function CustomTableSearch({ refetch, value, updateGetParams }) {
  const formContext = useForm({
    defaultValues: { q: value },
  });

  return (
    <FormContainer
      formContext={formContext}
      onSuccess={() => {}}
    >
      <TextFieldElement
        fullWidth
        size='small'
        name='q'
        placeholder='Поиск'
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') {
            updateGetParams({ q: e.target.value })
          }
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          ),
        }}
      />
    </FormContainer>
  )
}
