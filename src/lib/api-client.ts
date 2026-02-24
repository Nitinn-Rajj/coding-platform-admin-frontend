import { API_URL } from '@/config/env';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('admin_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    localStorage.removeItem('admin_token');
    window.location.href = '/login';
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Network response was not ok');
  }
  return response.json();
}

export const apiClient = {
  get: async <T>(path: string): Promise<T> => {
    const response = await fetch(`${API_URL}${path}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<T>(response);
  },

  post: async <T>(path: string, body?: unknown): Promise<T> => {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
  },

  put: async <T>(path: string, body?: unknown): Promise<T> => {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
  },

  delete: async <T>(path: string): Promise<T> => {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<T>(response);
  },
};
