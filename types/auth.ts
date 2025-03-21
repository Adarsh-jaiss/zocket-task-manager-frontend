export interface SignInData {
  email: string;
  password: string;
}

export interface SignUpData extends SignInData {
  first_name: string;
  last_name: string;
}

export interface AuthResponse {
  user_id: number;
  token: string;
  message: string;
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  logged_in_at: string;
} 