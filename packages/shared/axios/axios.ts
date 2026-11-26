import axios, { AxiosResponse, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: any;
  config: AxiosRequestConfig;
}

export interface ApiError {
  response: AxiosResponse;
  message: string;
}

function createApi(baseURL = import.meta.env.VITE_API_URL) {
  const instance = axios.create({
    baseURL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
  });

  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  });

  function handleError(error: any): ApiError {
    if (error.response) {
      return {
        response: error.response,
        message: error.response.data?.message || error.response.statusText,
      };
    } else if (error.request) {
      return { response: error.request, message: 'No response received from the server.' };
    } else {
      return { response: error, message: 'An error occurred while making the request.' };
    }
  }

  async function request<T = any>(
    method: string,
    url: string,
    data?: any,
    params?: any,
  ): Promise<ApiResponse<T>> {
    try {
      const response = await instance.request<T>({ method, url, data, params });
      return {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        config: response.config,
      };
    } catch (error) {
      throw handleError(error);
    }
  }

  return {
    api: instance,
    get: <T = any>(url: string, params?: any) => request<T>('GET', url, undefined, params),
    post: <T = any>(url: string, data?: any) => request<T>('POST', url, data),
    put: <T = any>(url: string, data?: any) => request<T>('PUT', url, data),
    patch: <T = any>(url: string, data?: any) => request<T>('PATCH', url, data),
    delete: <T = any>(url: string, data?: any, params?: any) =>
      request<T>('DELETE', url, data, params),
  };
}

export type ApiClient = {
  api: import('axios').AxiosInstance;
  get<T = any>(url: string, params?: any): Promise<ApiResponse<T>>;
  post<T = any>(url: string, data?: any): Promise<ApiResponse<T>>;
  put<T = any>(url: string, data?: any): Promise<ApiResponse<T>>;
  patch<T = any>(url: string, data?: any): Promise<ApiResponse<T>>;
  delete<T = any>(url: string, data?: any, params?: any): Promise<ApiResponse<T>>;
};

export { createApi };
