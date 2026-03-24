
const BASE_URL = 'https://billing.qtechx.com/api';

export type ApiError = {
  message?: string;
  status?: number;
  details?: any;
};

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    if (!res.ok) {
      throw {
        status: res.status,
        message: `Server Error ${res.status}: The server returned an invalid response (not JSON). Check the endpoint.`,
        details: text,
      };
    }
  }

  if (!res.ok) {
    const err: ApiError = {
      status: res.status,
      message: data?.message || `Request failed with status ${res.status}`,
      details: data || text,
    };
    throw err;
  }

  return data;
}

export async function get<T>(path: string, token?: string | null): Promise<T> {
  return request<T>(path, { method: 'GET' }, token);
}

export type LoginPayload = {
  phone?: string;
  identifier?: string;
  password: string;
};

export type RegisterPayload = {
  name: string;
  email?: string;
  password: string;
};

export type Customer = {
  id: string | number;
  name: string;
  email?: string;
  phone?: string;
};

export type Product = {
  id: string | number;
  product_code?: string;
  barcode?: string;
  name: string;
  name_tamil?: string;
  name_tanglish?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  status?: string;
  total_stock?: number;
  price: number; // For backward compatibility or main price
  mrp?: number;
  offer_price?: number;
  variants?: any[];
  expiry?: any;
  supplier?: any;
  images?: string[];
  [key: string]: any;
};

export type ProductData = Omit<Product, 'id'>;

export type BillItem = {
  product_id: string | number;
  name?: string;
  quantity: number;
  price?: number;
};

export type BillPayload = {
  customer_id?: string | number;
  customer_name?: string;
  customer_phone?: string;
  total_amount?: number;
  items: BillItem[];
};

export async function login(payload: LoginPayload) {
  return request<{ token: string; user?: any }>(`/auth/login`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function register(payload: RegisterPayload) {
  return request<{ token: string; user?: any }>(`/auth/register`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchCustomers(token?: string | null) {
  return request<Customer[]>(`/customers`, { method: 'GET' }, token);
}

export async function createCustomer(
  data: Omit<Customer, 'id'>,
  token?: string | null,
) {
  return request<Customer>(`/customers`, {
    method: 'POST',
    body: JSON.stringify(data),
  },
    token);
}

export async function fetchProducts(token?: string | null) {
  return request<Product[]>(`/products`, { method: 'GET' }, token);
}

export async function createProduct(
  data: ProductData,
  token?: string | null,
) {
  return request<Product>(`/products`, {
    method: 'POST',
    body: JSON.stringify(data),
  },
    token);
}

export async function updateProduct(
  id: string | number,
  data: Partial<ProductData>,
  token?: string | null,
) {
  return request<Product>(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  },
    token);
}

export async function fetchProductById(id: string | number, token?: string | null) {
  return request<Product>(`/products/${id}`, { method: 'GET' }, token);
}

export async function createBill(payload: BillPayload, token?: string | null) {
  return request<{ id: string | number }>(`/orders`, {
    method: 'POST',
    body: JSON.stringify(payload),
  },
    token);
}
export type Category = {
  id: string | number;
  catId?: string;
  name: string;
  description?: string;
  image?: string;
  subcategories?: string[];
};

export async function createCategory(
  data: Omit<Category, 'id'>,
  token?: string | null,
) {
  return request<Category>(`/categories`, {
    method: 'POST',
    body: JSON.stringify(data),
  },
    token);
}

export async function updateCategory(
  id: string | number,
  data: Partial<Omit<Category, 'id'>>,
  token?: string | null,
) {
  return request<Category>(`/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  },
    token);
}

export async function fetchCategoryById(id: string | number, token?: string | null) {
  return request<Category>(`/categories/${id}`, { method: 'GET' }, token);
}

export async function fetchCategories(token?: string | null) {
  return request<Category[]>(`/categories`, { method: 'GET' }, token);
}

export async function fetchOrders(token?: string | null) {
  return request<any[]>(`/orders`, { method: 'GET' }, token);
}
export async function fetchNextProductId(token?: string | null) {
  return request<{ nextId: string }>(`/products/next-id`, { method: 'GET' }, token);
}
