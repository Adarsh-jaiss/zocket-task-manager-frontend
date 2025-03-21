import axios from 'axios';

import { API_BASE_URL, API_ENDPOINTS } from '@/lib/api-config';
import { SignInData, SignUpData, AuthResponse } from '@/types/auth';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const authService = {
  async signIn(data: SignInData): Promise<AuthResponse> {
    try {
      console.log('Attempting sign in with:', { email: data.email });
      const response = await api.post<AuthResponse>(API_ENDPOINTS.auth.signIn, data);
      console.log('Sign in response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  },

  async signUp(data: SignUpData): Promise<AuthResponse> {
    try {
      console.log('Attempting sign up with:', { email: data.email });
      const response = await api.post<AuthResponse>(API_ENDPOINTS.auth.signUp, data);
      console.log('Sign up response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  },
}; 