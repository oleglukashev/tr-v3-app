import {
  Button,
  Container, Dialog, DialogTitle, Grid,
  Pagination,
} from "@mui/material";
import CustomTableSearch from "./custom-table-search";
import {useTheme} from "@mui/material/styles";
import CustomBack from "@/src/components/custom-back/custom-back";
import CustomCardTable from "@/src/components/custom-card-table/custom-card-table";
import useCustomTablePage from "@/src/components/custom-table-page/use-custom-table-page";

export default function CustomTablePage({
                                          tableHead,
                                          useQuery,
                                          title,
                                          back,
                                          search,
                                          onSubmitCreate,
                                          CreateForm,
                                          headerActions,
                                          RowComponent,
                                          customTablePage,
                                          isLoading,
                                          data,
                                          refetch,
                                          sx,
                                        }) {
  customTablePage = customTablePage || useCustomTablePage({});

  return (
    <Container sx={ sx || { pt: 2 }}>
      <CustomCardTable
        sx={{ mb: 2 }}
        data={data || []}
        isLoading={isLoading}
        table={customTablePage.table}
        title={title ? (
          <Grid
            container
            direction="row"
            justifyContent="space-between"
            alignItems="center">
            <Grid item>
              {!!back && <CustomBack href={back} sx={{ mr: 2 }} /> }
              {title}
              {!!onSubmitCreate && (
                <>
                  <Button size='mini' variant='contained' sx={{ ml: 2 }} onClick={() => customTablePage.setOpenCreateForm(true)}>Создать</Button>
                  <Dialog
                    fullWidth
                    maxWidth="sm"
                    open={customTablePage.openCreateForm}
                    onClose={() => customTablePage.setOpenCreateForm(false)}
                    transitionDuration={{
                      enter: (new useTheme()).transitions.duration.shortest,
                      exit: (new useTheme()).transitions.duration.shortest - 80,
                    }}>
                    <DialogTitle>Создание</DialogTitle>
                    <CreateForm
                      defaultValues={{}}
                      onSubmit={async (values) => {
                        const res = await onSubmitCreate(values);
                        if (!res.error) {
                          customTablePage.setOpenCreateForm(false);
                        }
                      }}
                    />
                  </Dialog>
                </>
              )}
            </Grid>
            <Grid item>
              {headerActions}
              {search && (
                <CustomTableSearch
                  value={customTablePage.searchParams.get('q')}
                  updateGetParams={customTablePage.updateGetParams}
                  refetch={refetch}
                />
              )}
            </Grid>
          </Grid>
        ) : null}
        RowComponent={RowComponent}
        tableHead={tableHead}
      />
      <>
        {data?.totalPages > 1 && (
          <Pagination
            count={data?.totalPages}
            page={customTablePage.customSearchParams.page}
            defaultPage={1}
            boundaryCount={2}
            onChange={(e, page) => {
              customTablePage.updateGetParams({page: page})
            }}
          />
        )}
      </>
    </Container>
  )
}
