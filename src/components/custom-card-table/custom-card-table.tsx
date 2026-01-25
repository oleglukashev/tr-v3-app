import {
  Box,
  Card,
  CardHeader,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@mui/material";
import Scrollbar from "@/src/components/scrollbar";
import {TableHeadCustom} from "@/src/components/table";

export default function CustomCardTable({ tableHead, table, data, content, isLoading, sx, title, RowComponent }: any) {
  let rowComponentProps;
  if (typeof RowComponent === 'object') {
    rowComponentProps = RowComponent.props;
    RowComponent = RowComponent.type;
  }
  return (
    <Card sx={sx}>
      <CardHeader sx={{ pb: 2 }} title={isLoading ? <Skeleton /> : title} />
      {
        isLoading ?
          <>
            <Skeleton sx={{my: 2, mx: 3}}/>
            <Skeleton sx={{my: 2, mx: 3}}/>
          </> :
          content ??
          <Scrollbar>
            <Table size={'small'} sx={{minWidth: 960}}>
              <TableHeadCustom
                order={table.order}
                orderBy={table.orderBy}
                headLabel={tableHead}
                rowCount={[].length}
                numSelected={table.selected.length}
                onSort={table.onSort}
              />

              <TableBody>
                {data?.length ? (
                  <>
                    {data.map((item: any) => (
                      <RowComponent
                        key={item.id}
                        item={item}
                        {...rowComponentProps}
                      />
                    ))}
                  </>
                ) : (
                  <TableRow>
                    <TableCell colSpan={tableHead.length - 1}>
                      <Box sx={{p: 2}}>
                        Данных нет
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Scrollbar>
      }
    </Card>
  )
}
