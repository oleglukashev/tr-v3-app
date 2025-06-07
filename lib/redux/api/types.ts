export interface IStock {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface IProduct {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface INomenclature {
  id: string;
  fullName: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface ICartItem {
  id: number;
  product: any;
  offer: any;
  createdAt: string;
  updatedAt: string;
}

export interface ICategory {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ICategoryAlias {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface IContractor {
  id: string;
}

export interface IOrder {
  id: string;
}
