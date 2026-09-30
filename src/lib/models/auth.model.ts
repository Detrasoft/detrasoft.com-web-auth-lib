/**
 * Modelos de autenticação para conexão com o authorization-server
 */

export interface UserLoginPayload {
  email: string;
  password: string;
}

export interface AuthenticationResponse {
  access_token?: string;
  refresh_token?: string;
  biometric_session_token?: string;
  first_device_login?: boolean;
  biometric_enrolled?: boolean;
  message?: string;
}

export interface AuthUser {
  id?: string;
  userId?: string;
  email?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  userName?: string;
  software?: string;
  roles?: string[];
  permissions?: string[];
  avatarUrl?: string;
  subscription?: string;
  provider?: string;
}
