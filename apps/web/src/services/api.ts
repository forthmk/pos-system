import { createApi } from '@shared/axios';

const { api, get, post, put, patch, delete: remove } = createApi();

export { api, get, post, put, patch, remove };
export type { ApiResponse, ApiError } from '@shared/axios';
