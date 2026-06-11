import { apiGet, apiPatch, apiPost, setTokens, clearTokens, getRefreshToken, type ApiResponse } from './client';

export type UserRole = 'patient' | 'clinician' | 'lab' | 'researcher' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  country?: string;
  language?: string;
  status?: string;
  profile?: {
    specialty?: string;
    institution?: string;
    bio?: string;
  };
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await apiPost<ApiResponse<LoginResponse>>('/auth/login', { email, password });
  setTokens(res.data.accessToken, res.data.refreshToken);
  return res.data.user;
}

export async function register(data: {
  email: string;
  password: string;
  fullName: string;
  role?: UserRole;
  country?: string;
  gender?: string;
  dateOfBirth?: string;
}, autoLogin = true): Promise<AuthUser> {
  const res = await apiPost<ApiResponse<LoginResponse>>('/auth/register', data);
  if (autoLogin) {
    setTokens(res.data.accessToken, res.data.refreshToken);
  }
  return res.data.user;
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) await apiPost('/auth/logout', { refreshToken });
  } finally {
    clearTokens();
  }
}

export async function getMe(): Promise<AuthUser> {
  const res = await apiGet<ApiResponse<AuthUser>>('/auth/me');
  return res.data;
}

export async function updateProfile(data: {
  fullName?: string;
  phone?: string;
  country?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | string;
  dateOfBirth?: string;
}): Promise<AuthUser> {
  const res = await apiPatch<ApiResponse<AuthUser>>('/auth/me', data);
  return res.data;
}
