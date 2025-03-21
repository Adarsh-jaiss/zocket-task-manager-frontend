export const API_BASE_URL =  'https://zocket-task-manager-backend.onrender.com/api'

export const API_ENDPOINTS = {
  auth: {
    signUp: '/auth/signup',
    signIn: '/auth/signin',
  },
  tasks: {
    list: '/v1/tasks',
    create: '/v1/tasks',
    get: (id: string) => `/v1/tasks/${id}`,
    update: (id: string) => `/v1/tasks/${id}`,
    delete: (id: string) => `/v1/tasks/${id}`,
    analyze: (id: string) => `/v1/tasks/${id}/analyze`,
  },
  users: {
    get: (id: string) => `/v1/user/${id}`,
  },
  ws: {
    connect: 'ws://https://zocket-task-manager-backend.onrender.com/api/v1/ws',
  },
};

export const getAuthHeader = (token: string) => ({
  Authorization: `Bearer ${token}`,
}); 