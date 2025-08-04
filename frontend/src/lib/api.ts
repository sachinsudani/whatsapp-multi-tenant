import axios from "axios";
import type { AxiosInstance, AxiosResponse } from "axios";
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
} from "../types/auth";
import type {
  WhatsAppDevice,
  Message,
  Contact,
  ChatGroup,
  SendMessageRequest,
  CreateDeviceRequest,
  UpdateDeviceRequest,
  DeviceQRResponse,
  DeviceStatusResponse,
  CreateContactRequest,
  UpdateContactRequest,
  CreateGroupRequest,
  UpdateGroupRequest,
} from "../types/whatsapp";

// Error handling utility
const handleApiError = (error: any) => {
  if (error.response?.data?.message) {
    throw new Error(error.response.data.message);
  }
  if (error.message) {
    throw new Error(error.message);
  }
  throw new Error('An unexpected error occurred');
};

// API base configuration
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 seconds timeout
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
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post("/auth/login", data);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post("/auth/register", data);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  refresh: async (data: RefreshTokenRequest): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post("/auth/refresh", data);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post("/auth/logout");
    } catch (error) {
      // Don't throw error for logout, just log it
      console.warn("Logout API call failed:", error);
    }
  },

  getProfile: async (): Promise<any> => {
    try {
      const response = await apiClient.get("/auth/profile");
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
};

// WhatsApp API
export const whatsappAPI = {
  // Devices
  getDevices: async (): Promise<WhatsAppDevice[]> => {
    try {
      const response = await apiClient.get("/whatsapp/devices");
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  getDevice: async (id: string): Promise<WhatsAppDevice> => {
    try {
      const response = await apiClient.get(`/whatsapp/devices/${id}`);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  createDevice: async (data: CreateDeviceRequest): Promise<WhatsAppDevice> => {
    try {
      const response = await apiClient.post("/whatsapp/devices", data);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  updateDevice: async (
    id: string,
    data: UpdateDeviceRequest
  ): Promise<WhatsAppDevice> => {
    try {
      const response = await apiClient.put(`/whatsapp/devices/${id}`, data);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  deleteDevice: async (id: string): Promise<{ message: string }> => {
    try {
      const response = await apiClient.delete(`/whatsapp/devices/${id}`);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  generateQR: async (id: string): Promise<DeviceQRResponse> => {
    try {
      const response = await apiClient.post(`/whatsapp/devices/${id}/qr`);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  getDeviceStatus: async (id: string): Promise<DeviceStatusResponse> => {
    try {
      const response = await apiClient.get(`/whatsapp/devices/${id}/status`);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  // Messages
  sendMessage: async (data: SendMessageRequest): Promise<Message> => {
    try {
      const response = await apiClient.post("/whatsapp/send", data);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  getMessages: async (
    params?: any
  ): Promise<{
    messages: Message[];
    total: number;
    page: number;
    limit: number;
  }> => {
    try {
      const response = await apiClient.get("/messages", { params });
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  getMessage: async (id: string): Promise<Message> => {
    try {
      const response = await apiClient.get(`/messages/${id}`);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  getMessageStats: async (params?: any): Promise<any> => {
    try {
      const response = await apiClient.get("/messages/stats", { params });
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  updateMessageStatus: async (id: string, status: string): Promise<Message> => {
    try {
      const response = await apiClient.put(`/messages/${id}/status`, { status });
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  deleteMessage: async (id: string): Promise<{ message: string }> => {
    try {
      const response = await apiClient.delete(`/messages/${id}`);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
};

// Contacts API
export const contactsAPI = {
  getContacts: async (): Promise<Contact[]> => {
    try {
      const response = await apiClient.get("/contacts");
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  getContact: async (id: string): Promise<Contact> => {
    try {
      const response = await apiClient.get(`/contacts/${id}`);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  createContact: async (data: CreateContactRequest): Promise<Contact> => {
    try {
      const response = await apiClient.post("/contacts", data);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  updateContact: async (id: string, data: UpdateContactRequest): Promise<Contact> => {
    try {
      const response = await apiClient.put(`/contacts/${id}`, data);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  deleteContact: async (id: string): Promise<{ message: string }> => {
    try {
      const response = await apiClient.delete(`/contacts/${id}`);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  getContactStats: async (id: string): Promise<any> => {
    try {
      const response = await apiClient.get(`/contacts/${id}/stats`);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
};

// Groups API
export const groupsAPI = {
  getGroups: async (): Promise<ChatGroup[]> => {
    try {
      const response = await apiClient.get("/groups");
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  getGroup: async (id: string): Promise<ChatGroup> => {
    try {
      const response = await apiClient.get(`/groups/${id}`);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  createGroup: async (data: CreateGroupRequest): Promise<ChatGroup> => {
    try {
      const response = await apiClient.post("/groups", data);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  updateGroup: async (id: string, data: UpdateGroupRequest): Promise<ChatGroup> => {
    try {
      const response = await apiClient.put(`/groups/${id}`, data);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  deleteGroup: async (id: string): Promise<{ message: string }> => {
    try {
      const response = await apiClient.delete(`/groups/${id}`);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  getGroupStats: async (id: string): Promise<any> => {
    try {
      const response = await apiClient.get(`/groups/${id}/stats`);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  addParticipant: async (id: string, phoneNumber: string): Promise<ChatGroup> => {
    try {
      const response = await apiClient.post(`/groups/${id}/participants`, { phoneNumber });
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  removeParticipant: async (id: string, phoneNumber: string): Promise<ChatGroup> => {
    try {
      const response = await apiClient.delete(`/groups/${id}/participants/${phoneNumber}`);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
};

export default apiClient;