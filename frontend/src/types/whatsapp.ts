export interface WhatsAppDevice {
  id: string;
  name: string;
  description?: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  isActive: boolean;
  lastConnectedAt?: Date;
  lastMessageAt?: Date;
  messagesSent: number;
  messagesReceived: number;
  tenantId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  deviceId: string;
  phoneNumber: string;
  messageType: 'text' | 'image' | 'document' | 'audio' | 'video';
  content: string;
  caption?: string;
  groupId?: string;
  replyToMessageId?: string;
  mentionedPhoneNumbers?: string[];
  broadcast: boolean;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  whatsappMessageId?: string;
  errorMessage?: string;
  tenantId: string;
  sentBy: string;
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  company?: string;
  notes?: string;
  isBlocked?: boolean;
  lastMessageAt?: Date;
  messageCount?: number;
  tenantId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatGroup {
  id: string;
  name: string;
  description?: string;
  groupId?: string;
  participants?: string[];
  isActive: boolean;
  tenantId: string;
  createdBy: string;
  lastMessageAt?: Date;
  messageCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SendMessageRequest {
  deviceId: string;
  phoneNumber: string;
  messageType?: 'text' | 'image' | 'document' | 'audio' | 'video';
  content: string;
  caption?: string;
  groupId?: string;
  replyToMessageId?: string;
  mentionedPhoneNumbers?: string[];
  broadcast?: boolean;
}

export interface CreateDeviceRequest {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateDeviceRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface MessageStats {
  total: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  today: number;
  todayChange: string;
  thisWeek: number;
  thisMonth: number;
}

export interface DeviceQRResponse {
  qrCode: string;
  expiresAt: Date;
}

export interface DeviceStatusResponse {
  status: string;
  info?: any;
}

export interface CreateContactRequest {
  name: string;
  phoneNumber: string;
  email?: string;
  company?: string;
  notes?: string;
}

export interface UpdateContactRequest {
  name?: string;
  phoneNumber?: string;
  email?: string;
  company?: string;
  notes?: string;
  isBlocked?: boolean;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  participants?: string[];
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
}