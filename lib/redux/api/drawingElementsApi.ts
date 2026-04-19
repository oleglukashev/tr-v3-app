import { BaseApi } from "./baseApi";
import { customTrFetchBase } from "../../customFetchBase";

const collectionPath = 'drawing_elements';

export const drawingElementsApi = (new BaseApi({
  reducerPath: collectionPath,
  baseQuery: customTrFetchBase,
  collectionPath,
  extraEndpoints: (builder) => ({
    // @ts-ignore
    getAll: builder.query<any[], any>({
      query: (params: any) => ({ url: collectionPath, params }),
      providesTags: (result: any) => {
        if (Array.isArray(result)) {
          return [
            ...result.map(({ id }) => ({ type: collectionPath as const, id })),
            { type: collectionPath, id: 'LIST' },
          ];
        }
        return [{ type: collectionPath, id: 'LIST' }];
      },
    }),
  }),
})).create();

export const {
  useGetAllQuery,
  useCreateMutation,
  useUpdateMutation,
  useRemoveMutation,
} = drawingElementsApi;
