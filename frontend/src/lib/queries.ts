import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
    AuthResponse,
    LoginRequest,
    RegisterRequest,
} from '../types/auth';
import type {
    ChatGroup,
    Contact,
    CreateDeviceRequest,
    SendMessageRequest,
    UpdateDeviceRequest,
    WhatsAppDevice,
} from '../types/whatsapp';
import {
    authAPI,
    contactsAPI,
    groupsAPI,
    whatsappAPI
} from './api';

// Query Keys
export const queryKeys = {
    devices: ['devices'] as const,
    device: (id: string) => ['devices', id] as const,
    deviceStatus: (id: string) => ['devices', id, 'status'] as const,
    messages: (params?: any) => ['messages', params] as const,
    message: (id: string) => ['messages', id] as const,
    messageStats: (params?: any) => ['messages', 'stats', params] as const,
    contacts: ['contacts'] as const,
    contact: (id: string) => ['contacts', id] as const,
    contactStats: (id: string) => ['contacts', id, 'stats'] as const,
    groups: ['groups'] as const,
    group: (id: string) => ['groups', id] as const,
    groupStats: (id: string) => ['groups', id, 'stats'] as const,
};

// Auth Hooks
export const useLogin = () => {
    return useMutation({
        mutationFn: (data: LoginRequest) => authAPI.login(data),
        onSuccess: (data: AuthResponse) => {
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            localStorage.setItem('user', JSON.stringify(data.user));
            toast.success('Login successful!');
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.message;
            if (Array.isArray(errorMessage)) {
                toast.error(errorMessage.join(', '));
            } else {
                toast.error(errorMessage || 'Login failed');
            }
        },
    });
};

export const useRegister = () => {
    return useMutation({
        mutationFn: (data: RegisterRequest) => authAPI.register(data),
        onSuccess: (data: AuthResponse) => {
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            localStorage.setItem('user', JSON.stringify(data.user));
            toast.success('Registration successful!');
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.message;
            if (Array.isArray(errorMessage)) {
                toast.error(errorMessage.join(', '));
            } else {
                toast.error(errorMessage || 'Registration failed');
            }
        },
    });
};

export const useLogout = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => authAPI.logout(),
        onSuccess: () => {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            queryClient.clear();
            toast.success('Logged out successfully');
        },
        onError: (error: any) => {
            // Still clear local storage even if API call fails
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            queryClient.clear();
            const errorMessage = error.response?.data?.message;
            if (Array.isArray(errorMessage)) {
                toast.error(errorMessage.join(', '));
            } else {
                toast.error(errorMessage || 'Logout failed');
            }
        },
    });
};

// Device Hooks
export const useDevices = () => {
    return useQuery({
        queryKey: queryKeys.devices,
        queryFn: () => whatsappAPI.getDevices(),
        staleTime: 30000, // 30 seconds
    });
};

export const useDevice = (id: string) => {
    return useQuery({
        queryKey: queryKeys.device(id),
        queryFn: () => whatsappAPI.getDevice(id),
        enabled: !!id,
        staleTime: 30000,
    });
};

export const useDeviceStatus = (id: string, enabled = true) => {
    return useQuery({
        queryKey: queryKeys.deviceStatus(id),
        queryFn: () => whatsappAPI.getDeviceStatus(id),
        enabled: !!id && enabled,
        refetchInterval: 10000, // Refetch every 10 seconds
        staleTime: 5000, // 5 seconds
    });
};

export const useCreateDevice = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateDeviceRequest) => whatsappAPI.createDevice(data),
        onSuccess: (newDevice: WhatsAppDevice) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.devices });
            toast.success(`Device "${newDevice.name}" created successfully!`);
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.message;
            if (Array.isArray(errorMessage)) {
                toast.error(errorMessage.join(', '));
            } else {
                toast.error(errorMessage || 'Failed to create device');
            }
        },
    });
};

export const useUpdateDevice = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateDeviceRequest }) =>
            whatsappAPI.updateDevice(id, data),
        onSuccess: (updatedDevice: WhatsAppDevice) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.devices });
            queryClient.invalidateQueries({ queryKey: queryKeys.device(updatedDevice.id) });
            toast.success(`Device "${updatedDevice.name}" updated successfully!`);
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.message;
            if (Array.isArray(errorMessage)) {
                toast.error(errorMessage.join(', '));
            } else {
                toast.error(errorMessage || 'Failed to update device');
            }
        },
    });
};

export const useDeleteDevice = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => whatsappAPI.deleteDevice(id),
        onSuccess: (_, deviceId) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.devices });
            queryClient.removeQueries({ queryKey: queryKeys.device(deviceId) });
            queryClient.removeQueries({ queryKey: queryKeys.deviceStatus(deviceId) });
            toast.success('Device deleted successfully!');
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.message;
            if (Array.isArray(errorMessage)) {
                toast.error(errorMessage.join(', '));
            } else {
                toast.error(errorMessage || 'Failed to delete device');
            }
        },
    });
};

export const useGenerateQR = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => whatsappAPI.generateQR(id),
        onSuccess: (_, deviceId) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.device(deviceId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.deviceStatus(deviceId) });
            toast.success('QR code generated successfully!');
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.message;
            if (Array.isArray(errorMessage)) {
                toast.error(errorMessage.join(', '));
            } else {
                toast.error(errorMessage || 'Failed to generate QR code');
            }
        },
    });
};

// Message Hooks
export const useMessages = (params?: any) => {
    return useQuery({
        queryKey: queryKeys.messages(params),
        queryFn: () => whatsappAPI.getMessages(params),
        staleTime: 10000, // 10 seconds
    });
};

export const useMessage = (id: string) => {
    return useQuery({
        queryKey: queryKeys.message(id),
        queryFn: () => whatsappAPI.getMessage(id),
        enabled: !!id,
        staleTime: 30000,
    });
};

export const useMessageStats = (params?: any) => {
    return useQuery({
        queryKey: queryKeys.messageStats(params),
        queryFn: () => whatsappAPI.getMessageStats(params),
        staleTime: 60000, // 1 minute
    });
};

export const useSendMessage = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: SendMessageRequest) => whatsappAPI.sendMessage(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.messages() });
            queryClient.invalidateQueries({ queryKey: queryKeys.messageStats() });
            toast.success('Message sent successfully!');
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.message;
            if (Array.isArray(errorMessage)) {
                toast.error(errorMessage.join(', '));
            } else {
                toast.error(errorMessage || 'Failed to send message');
            }
        },
    });
};

export const useDeleteMessage = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => whatsappAPI.deleteMessage(id),
        onSuccess: (_, messageId) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.messages() });
            queryClient.removeQueries({ queryKey: queryKeys.message(messageId) });
            toast.success('Message deleted successfully!');
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.message;
            if (Array.isArray(errorMessage)) {
                toast.error(errorMessage.join(', '));
            } else {
                toast.error(errorMessage || 'Failed to delete message');
            }
        },
    });
};

// Contact Hooks
export const useContacts = () => {
    return useQuery({
        queryKey: queryKeys.contacts,
        queryFn: () => contactsAPI.getContacts(),
        staleTime: 60000, // 1 minute
    });
};

export const useContact = (id: string) => {
    return useQuery({
        queryKey: queryKeys.contact(id),
        queryFn: () => contactsAPI.getContact(id),
        enabled: !!id,
        staleTime: 60000,
    });
};

export const useContactStats = (id: string) => {
    return useQuery({
        queryKey: queryKeys.contactStats(id),
        queryFn: () => contactsAPI.getContactStats(id),
        enabled: !!id,
        staleTime: 300000, // 5 minutes
    });
};

export const useCreateContact = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: any) => contactsAPI.createContact(data),
        onSuccess: (newContact: Contact) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.contacts });
            toast.success(`Contact "${newContact.name}" created successfully!`);
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.message;
            if (Array.isArray(errorMessage)) {
                toast.error(errorMessage.join(', '));
            } else {
                toast.error(errorMessage || 'Failed to create contact');
            }
        },
    });
};

export const useUpdateContact = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            contactsAPI.updateContact(id, data),
        onSuccess: (updatedContact: Contact) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.contacts });
            queryClient.invalidateQueries({ queryKey: queryKeys.contact(updatedContact.id) });
            toast.success(`Contact "${updatedContact.name}" updated successfully!`);
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.message;
            if (Array.isArray(errorMessage)) {
                toast.error(errorMessage.join(', '));
            } else {
                toast.error(errorMessage || 'Failed to update contact');
            }
        },
    });
};

export const useDeleteContact = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => contactsAPI.deleteContact(id),
        onSuccess: (_, contactId) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.contacts });
            queryClient.removeQueries({ queryKey: queryKeys.contact(contactId) });
            queryClient.removeQueries({ queryKey: queryKeys.contactStats(contactId) });
            toast.success('Contact deleted successfully!');
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.message;
            if (Array.isArray(errorMessage)) {
                toast.error(errorMessage.join(', '));
            } else {
                toast.error(errorMessage || 'Failed to delete contact');
            }
        },
    });
};

// Group Hooks
export const useGroups = () => {
    return useQuery({
        queryKey: queryKeys.groups,
        queryFn: () => groupsAPI.getGroups(),
        staleTime: 60000, // 1 minute
    });
};

export const useGroup = (id: string) => {
    return useQuery({
        queryKey: queryKeys.group(id),
        queryFn: () => groupsAPI.getGroup(id),
        enabled: !!id,
        staleTime: 60000,
    });
};

export const useGroupStats = (id: string) => {
    return useQuery({
        queryKey: queryKeys.groupStats(id),
        queryFn: () => groupsAPI.getGroupStats(id),
        enabled: !!id,
        staleTime: 300000, // 5 minutes
    });
};

export const useCreateGroup = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: any) => groupsAPI.createGroup(data),
        onSuccess: (newGroup: ChatGroup) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.groups });
            toast.success(`Group "${newGroup.name}" created successfully!`);
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.message;
            if (Array.isArray(errorMessage)) {
                toast.error(errorMessage.join(', '));
            } else {
                toast.error(errorMessage || 'Failed to create group');
            }
        },
    });
};

export const useUpdateGroup = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            groupsAPI.updateGroup(id, data),
        onSuccess: (updatedGroup: ChatGroup) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.groups });
            queryClient.invalidateQueries({ queryKey: queryKeys.group(updatedGroup.id) });
            toast.success(`Group "${updatedGroup.name}" updated successfully!`);
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.message;
            if (Array.isArray(errorMessage)) {
                toast.error(errorMessage.join(', '));
            } else {
                toast.error(errorMessage || 'Failed to update group');
            }
        },
    });
};

export const useDeleteGroup = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => groupsAPI.deleteGroup(id),
        onSuccess: (_, groupId) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.groups });
            queryClient.removeQueries({ queryKey: queryKeys.group(groupId) });
            queryClient.removeQueries({ queryKey: queryKeys.groupStats(groupId) });
            toast.success('Group deleted successfully!');
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.message;
            if (Array.isArray(errorMessage)) {
                toast.error(errorMessage.join(', '));
            } else {
                toast.error(errorMessage || 'Failed to delete group');
            }
        },
    });
};

export const useAddParticipant = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, phoneNumber }: { id: string; phoneNumber: string }) =>
            groupsAPI.addParticipant(id, phoneNumber),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.group(id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.groups });
            toast.success('Participant added successfully!');
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.message;
            if (Array.isArray(errorMessage)) {
                toast.error(errorMessage.join(', '));
            } else {
                toast.error(errorMessage || 'Failed to add participant');
            }
        },
    });
};

export const useRemoveParticipant = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, phoneNumber }: { id: string; phoneNumber: string }) =>
            groupsAPI.removeParticipant(id, phoneNumber),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.group(id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.groups });
            toast.success('Participant removed successfully!');
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.message;
            if (Array.isArray(errorMessage)) {
                toast.error(errorMessage.join(', '));
            } else {
                toast.error(errorMessage || 'Failed to remove participant');
            }
        },
    });
};