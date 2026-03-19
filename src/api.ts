
const BASE_URL = 'https://billing.qtechx.com';

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

export type LoginPayload = {
  phone?: string;
  identifier?: string;
  password: string;
};

export type RegisterPayload = {
  name: string;
  email?: string;
  phone: string;
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
  name: string;
  price: number;
};

export type BillItem = {
  product_id: string | number;
  quantity: number;
};

export type BillPayload = {
  customer_id: string | number;
  items: BillItem[];
};

export async function login(payload: LoginPayload) {
  return request<{ token: string; user?: any }>(`/api/auth/login`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function register(payload: RegisterPayload) {
  return request<{ token: string; user?: any }>(`/api/auth/register`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchCustomers(token?: string | null) {
  return request<Customer[]>(`/api/customers`, { method: 'GET' }, token);
}

export async function createCustomer(
  data: Omit<Customer, 'id'>,
  token?: string | null,
) {
  return request<Customer>(`/api/customers`, {
    method: 'POST',
    body: JSON.stringify(data),
  },
  token);
}

export async function fetchProducts(token?: string | null) {
  return request<Product[]>(`/api/products`, { method: 'GET' }, token);
}

export async function createProduct(
  data: Omit<Product, 'id'>,
  token?: string | null,
) {
  return request<Product>(`/api/products`, {
    method: 'POST',
    body: JSON.stringify(data),
  },
  token);
}

export async function createBill(payload: BillPayload, token?: string | null) {
  return request<{ id: string | number }>(`/api/bills`, {
    method: 'POST',
    body: JSON.stringify(payload),
  },
  token);
}
