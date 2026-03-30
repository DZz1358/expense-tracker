export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}
