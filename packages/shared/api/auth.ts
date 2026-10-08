import { createApi } from '../axios/axios';
import type { ApiResponse } from '../axios/axios';

const api = createApi();

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    user_id: number;
    name: string;
    username: string;
    role: string;
  };
}

export const authApi = {
  login: (data: LoginPayload): Promise<ApiResponse<LoginResponse>> =>
    api.post('/api/auth/login', data),

  me: (): Promise<ApiResponse<LoginResponse['user']>> =>
    api.get('/api/auth/me'),
};
