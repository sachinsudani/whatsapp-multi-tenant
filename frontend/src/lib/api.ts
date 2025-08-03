import axios from "axios";
import type { AxiosInstance, AxiosResponse } from "axios";
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
} from "../../../shared/types/auth";
import type {
  WhatsAppDevice,
  Message,
  Contact,
  ChatGroup,
  SendMessageRequest,
  CreateDeviceRequest,
  UpdateDeviceRequest,
} from "../../../shared/types/whatsapp";

// API base configuration
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken } = response.data;
          localStorage.setItem("accessToken", accessToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh token failed, redirect to login
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (data: LoginRequest): Promise<AuthResponse> =>
    apiClient.post("/auth/login", data).then((res) => res.data),

  register: (data: RegisterRequest): Promise<AuthResponse> =>
    apiClient.post("/auth/register", data).then((res) => res.data),

  refresh: (data: RefreshTokenRequest): Promise<AuthResponse> =>
    apiClient.post("/auth/refresh", data).then((res) => res.data),

  logout: (): Promise<void> =>
    apiClient.post("/auth/logout").then((res) => res.data),
};

// WhatsApp API
export const whatsappAPI = {
  // Devices
  getDevices: (): Promise<WhatsAppDevice[]> =>
    apiClient.get("/whatsapp/devices").then((res) => res.data),

  getDevice: (id: string): Promise<WhatsAppDevice> =>
    apiClient.get(`/whatsapp/devices/${id}`).then((res) => res.data),

  createDevice: (data: CreateDeviceRequest): Promise<WhatsAppDevice> =>
    apiClient.post("/whatsapp/devices", data).then((res) => res.data),

  updateDevice: (
    id: string,
    data: UpdateDeviceRequest
  ): Promise<WhatsAppDevice> =>
    apiClient.put(`/whatsapp/devices/${id}`, data).then((res) => res.data),

  deleteDevice: (id: string): Promise<{ message: string }> =>
    apiClient.delete(`/whatsapp/devices/${id}`).then((res) => res.data),

  generateQR: (id: string): Promise<{ qrCode: string; expiresAt: Date }> =>
    apiClient.post(`/whatsapp/devices/${id}/qr`).then((res) => res.data),

  getDeviceStatus: (id: string): Promise<{ status: string; info?: any }> =>
    apiClient.get(`/whatsapp/devices/${id}/status`).then((res) => res.data),

  // Messages
  sendMessage: (data: SendMessageRequest): Promise<Message> =>
    apiClient.post("/whatsapp/send", data).then((res) => res.data),

  getMessages: (
    params?: any
  ): Promise<{
    messages: Message[];
    total: number;
    page: number;
    limit: number;
  }> => apiClient.get("/messages", { params }).then((res) => res.data),

  getMessage: (id: string): Promise<Message> =>
    apiClient.get(`/messages/${id}`).then((res) => res.data),

  getMessageStats: (params?: any): Promise<any> =>
    apiClient.get("/messages/stats", { params }).then((res) => res.data),

  updateMessageStatus: (id: string, status: string): Promise<Message> =>
    apiClient.put(`/messages/${id}/status`, { status }).then((res) => res.data),

  deleteMessage: (id: string): Promise<{ message: string }> =>
    apiClient.delete(`/messages/${id}`).then((res) => res.data),
};

// Contacts API
export const contactsAPI = {
  getContacts: (): Promise<Contact[]> =>
    apiClient.get("/contacts").then((res) => res.data),

  getContact: (id: string): Promise<Contact> =>
    apiClient.get(`/contacts/${id}`).then((res) => res.data),

  createContact: (data: any): Promise<Contact> =>
    apiClient.post("/contacts", data).then((res) => res.data),

  updateContact: (id: string, data: any): Promise<Contact> =>
    apiClient.put(`/contacts/${id}`, data).then((res) => res.data),

  deleteContact: (id: string): Promise<{ message: string }> =>
    apiClient.delete(`/contacts/${id}`).then((res) => res.data),

  getContactStats: (id: string): Promise<any> =>
    apiClient.get(`/contacts/${id}/stats`).then((res) => res.data),
};

// Groups API
export const groupsAPI = {
  getGroups: (): Promise<ChatGroup[]> =>
    apiClient.get("/groups").then((res) => res.data),

  getGroup: (id: string): Promise<ChatGroup> =>
    apiClient.get(`/groups/${id}`).then((res) => res.data),

  createGroup: (data: any): Promise<ChatGroup> =>
    apiClient.post("/groups", data).then((res) => res.data),

  updateGroup: (id: string, data: any): Promise<ChatGroup> =>
    apiClient.put(`/groups/${id}`, data).then((res) => res.data),

  deleteGroup: (id: string): Promise<{ message: string }> =>
    apiClient.delete(`/groups/${id}`).then((res) => res.data),

  getGroupStats: (id: string): Promise<any> =>
    apiClient.get(`/groups/${id}/stats`).then((res) => res.data),

  addParticipant: (id: string, phoneNumber: string): Promise<ChatGroup> =>
    apiClient
      .post(`/groups/${id}/participants`, { phoneNumber })
      .then((res) => res.data),

  removeParticipant: (id: string, phoneNumber: string): Promise<ChatGroup> =>
    apiClient
      .delete(`/groups/${id}/participants/${phoneNumber}`)
      .then((res) => res.data),
};

export default apiClient;
