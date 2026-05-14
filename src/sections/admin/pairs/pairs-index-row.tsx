import {IconButton, TableCell, TableRow} from "@mui/material";
import Label from "src/components/label";
import Iconify from "@/src/components/iconify";
import CustomPopover, {usePopover} from "@/src/components/custom-popover";
import CustomEditRow from "@/src/components/custom-edit-row/custom-edit-row";
import CustomDialog from "@/src/components/custom-dialog/custom-dialog";
import {useCallback, useState} from "react";
import {useRemoveMutation, useUpdateMutation} from "@/lib/redux/api/pairApi";
import {onSubmitWrapper} from "@/src/utils/submit";
import CustomRemoveDialog from "@/src/components/custom-remove-dialog/custom-remove-dialog";
import CustomDeleteRow from "@/src/components/custom-delete-row/custom-delete-row";
import moment from "moment/moment";
import PairForm from "@/src/sections/admin/pairs/pairs-form";

type Props = {
  item: any
};

export default function PairsIndexRow({ item }: Props) {
  const [openUpdateForm, setOpenUpdateForm] = useState<boolean>(false);
  const [openDelete, setOpenDelete] = useState<boolean>(false);
  const popover = usePopover();
  const [update, { isLoading: isUpdateLoading }] = useUpdateMutation();
  const [remove, { isLoading: isRemoveLoading }] = useRemoveMutation();

  const onSubmitUpdate = useCallback((values) => {
    const data = Object.assign({}, values);
    data.clusterPrecision = data.clusterPrecision.trim().length ? JSON.parse(data.clusterPrecision) : null;
    return onSubmitWrapper(() => update({ id: item.id, values: data }), () => setOpenUpdateForm(false), 'Успешно обновлено');
  }, [item.id]);

  const onSubmitDelete = useCallback((values) => {
    return onSubmitWrapper(() => remove(item.id), () => setOpenDelete(false), 'Успешно удалено');
  }, [item.id]);

  return (
    <TableRow key={item.id}>
      <TableCell>{item.id}</TableCell>
      <TableCell><Label color='success'>{item.name}</Label></TableCell>
      <TableCell><Label color={item.activated ? 'success' : 'error'}>{item.activated ? 'Yes' : 'No'}</Label></TableCell>
      <TableCell><Label color={item.isDhm ? 'success' : 'default'}>{item.isDhm ? 'DHM' : '-'}</Label></TableCell>
      <TableCell><Label color={item.isUsedToKline ? 'success' : 'error'}>{item.isUsedToKline ? 'Yes' : 'No'}</Label></TableCell>
      <TableCell><Label color={item.isUsedToBidasks ? 'success' : 'error'}>{item.isUsedToBidasks ? 'Yes' : 'No'}</Label></TableCell>
      <TableCell align='right'>
        <IconButton color={popover.open ? 'inherit' : 'default'} onClick={popover.onOpen}>
          <Iconify icon="eva:more-vertical-fill" />
        </IconButton>

        <CustomPopover
          open={popover.open}
          onClose={popover.onClose}
        >
          <CustomEditRow
            onMenuClick={() => {
              setOpenUpdateForm(true);
              popover.onClose();
            }}
          />

          <CustomDeleteRow
            onMenuClick={() => {
              setOpenDelete(true);
              popover.onClose();
            }}
          />
        </CustomPopover>

        <CustomDialog
          open={openUpdateForm}
          onClose={() => setOpenUpdateForm(false)}
          title='Редактирование пары'
          content={(
            <PairForm
              defaultValues={{ ...item, clusterPrecision: JSON.stringify(item.clusterPrecision) }}
              onSubmit={onSubmitUpdate}
            />
          )}
        />

        <CustomRemoveDialog
          open={openDelete}
          onClose={() => setOpenDelete(false)}
          onConfirm={onSubmitDelete}
        />
      </TableCell>
    </TableRow>
  )
}
