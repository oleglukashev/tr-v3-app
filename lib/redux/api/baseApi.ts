import { createApi } from "@reduxjs/toolkit/dist/query/react";
import { concat } from 'lodash';

type props = {
  reducerPath: string,
  baseQuery?: any,
  tagTypes?: any[],
  extraEndpoints?: any,
  collectionPath: string
  formData?: boolean,
}

export class BaseApi {
  params: props;
  tagTypes: any[];

  constructor(params: props) {
    this.params = params;
    this.tagTypes =  concat([params.reducerPath], params.tagTypes ? params.tagTypes : []);
  }

  create = () => {
    const self = this;
    return createApi({
      reducerPath: self.params.reducerPath,
      baseQuery: self.params.baseQuery,
      tagTypes: self.tagTypes,
      endpoints: (builder: any) => (Object.assign({
        // TODO: implement dynamic type
        // @ts-ignore
        getAll: builder.query<any[], { page: string; }>({
          query(arg) {
            return {
              url: self.params.collectionPath,
              params: arg,
            };
          },
          providesTags: (result: any) => BaseApi.providesTags(result, self.params.reducerPath),
          transformResponse: (results: {
            items: any[];
            totalPages: number;
            page: number;
          }) => {
            return results;
          },
        }),
        // TODO: implement dynamic type
        // @ts-ignore
        get: builder.query<any, string>({
          query(id) {
            return {
              url: `${self.params.collectionPath}/${id}`,
            };
          },
        }),
        // TODO: implement dynamic type
        // @ts-ignore
        create: builder.mutation<any, any>({
          query(values: any) {
            return {
              url: `${self.params.collectionPath}`,
              method: 'POST',
              body: self.params.formData ? BaseApi.formDataValues(values) : values,
              formData: self.params.formData,
            };
          },
          invalidatesTags: (result, error, p) => BaseApi.invalidatesTags(result, error, p, self.params.reducerPath),
          transformResponse: (response: any) => response,
        }),
        // TODO: implement dynamic type
        // @ts-ignore
        update: builder.mutation<any, { id: number; item: any }>({
          query({ id, values }: any) {
            return {
              url: `${self.params.collectionPath}/${id}`,
              method: 'PATCH',
              body: self.params.formData ? BaseApi.formDataValues(values) : values,
              formData: self.params.formData,
            };
          },
          invalidatesTags: (result, error, p) => BaseApi.invalidatesTags(result, error, p, self.params.reducerPath),
          transformResponse: (response: any) => response,
        }),
        // @ts-ignore
        remove: builder.mutation<any, string>({
          query(id: number) {
            return {
              url: `${self.params.collectionPath}/${id}`,
              method: 'DELETE',
            };
          },
          invalidatesTags: (result, error, p) => BaseApi.invalidatesTags(result, error, p, self.params.reducerPath),
        }),
      }, self.params.extraEndpoints ? self.params.extraEndpoints(builder) : {})),
    });
  }

  static invalidatesTags = (result, error, p, reducerPath) => {
    return result
      ? [
        { type: reducerPath, id: p.id },
        { type: reducerPath, id: 'LIST' },
      ]
      : [{ type: reducerPath, id: 'LIST' }];
  }

  static providesTags = (result: any, reducerPath: any) => {
    return result?.items
      ? [
        ...result.items.map(({ id }) => ({
          type: reducerPath as const,
          id,
        })),
        { type: reducerPath, id: 'LIST' },
      ]
      : [{ type: reducerPath, id: 'LIST' }];
  }

  static formDataValues(values) {
    const formData = new FormData();
    for (const item of Object.keys(values)) {
      formData.append(item, values[item]);
    }
    return formData;
  }
}
