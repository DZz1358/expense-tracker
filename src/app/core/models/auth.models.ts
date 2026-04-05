export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  dateOfBirth?: string | null;
  avatarUrl?: string | null;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export type RegisterResponse = LoginResponse;

export interface UpdateProfileRequest {
  name: string;
  dateOfBirth?: string | null;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
