import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AlertCircle,
    Calendar,
    CheckCircle,
    Clock,
    MessageSquare,
    MoreVertical,
    Paperclip,
    Phone,
    RefreshCw,
    Search,
    Send
} from 'lucide-react';
import React, { useState } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import { contactsAPI, whatsappAPI } from '../lib/api';

const MessagesPage: React.FC = () => {
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [messageType, setMessageType] = useState<'text' | 'image' | 'document' | 'audio' | 'video'>('text');
  const [composeMessage, setComposeMessage] = useState({
    phoneNumber: '',
    content: '',
    caption: '',
    deviceId: '',
  });

  const queryClient = useQueryClient();

  // Fetch data
  const { data: devices, isLoading: devicesLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: whatsappAPI.getDevices,
  });

  const { data: contacts, isLoading: contactsLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: contactsAPI.getContacts,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', searchTerm],
    queryFn: () => whatsappAPI.getMessages({ 
      search: searchTerm,
      limit: 50,
      deviceId: selectedDevice || undefined,
    }),
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: whatsappAPI.sendMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setComposeMessage({
        phoneNumber: '',
        content: '',
        caption: '',
        deviceId: '',
      });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeMessage.phoneNumber || !composeMessage.content || !composeMessage.deviceId) {
      return;
    }

    sendMessageMutation.mutate({
      deviceId: composeMessage.deviceId,
      phoneNumber: composeMessage.phoneNumber,
      content: composeMessage.content,
      caption: composeMessage.caption,
      messageType: messageType,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'read':
        return <CheckCircle className="h-4 w-4 text-purple-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'text-green-600 bg-green-100';
      case 'delivered':
        return 'text-blue-600 bg-blue-100';
      case 'read':
        return 'text-purple-600 bg-purple-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (devicesLoading || contactsLoading || messagesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  const connectedDevices = devices?.filter(d => d.status === 'connected') || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
          <p className="mt-1 text-sm text-gray-500">
            Send and manage your WhatsApp messages
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['messages'] })}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Message Composition */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Send Message</h3>
            </div>
            <div className="p-6">
              <form onSubmit={handleSendMessage} className="space-y-4">
                {/* Device Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Device
                  </label>
                  <select
                    value={composeMessage.deviceId}
                    onChange={(e) => setComposeMessage(prev => ({ ...prev, deviceId: e.target.value }))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    required
                  >
                    <option value="">Choose a device</option>
                    {connectedDevices.map((device) => (
                      <option key={device.id} value={device.id}>
                        {device.name} ({device.status})
                      </option>
                    ))}
                  </select>
                  {connectedDevices.length === 0 && (
                    <p className="mt-1 text-sm text-red-600">
                      No connected devices available
                    </p>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={composeMessage.phoneNumber}
                      onChange={(e) => setComposeMessage(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      placeholder="e.g., 1234567890"
                      className="w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      required
                    />
                  </div>
                </div>

                {/* Message Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message Type
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="text"
                        checked={messageType === 'text'}
                        onChange={(e) => setMessageType(e.target.value as 'text')}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Text</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="image"
                        checked={messageType === 'image'}
                        onChange={(e) => setMessageType(e.target.value as 'image')}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Image</span>
                    </label>
                  </div>
                </div>

                {/* Message Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message Content
                  </label>
                  <textarea
                    value={composeMessage.content}
                    onChange={(e) => setComposeMessage(prev => ({ ...prev, content: e.target.value }))}
                    rows={4}
                    placeholder="Type your message here..."
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    required
                  />
                </div>

                {/* Caption (for media) */}
                {messageType !== 'text' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Caption (optional)
                    </label>
                    <textarea
                      value={composeMessage.caption}
                      onChange={(e) => setComposeMessage(prev => ({ ...prev, caption: e.target.value }))}
                      rows={2}
                      placeholder="Add a caption to your media..."
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                  </div>
                )}

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={sendMessageMutation.isPending || connectedDevices.length === 0}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  {sendMessageMutation.isPending ? (
                    <>
                      <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Message History */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Message History</h3>
                <div className="flex items-center space-x-4">
                  {/* Device Filter */}
                  <select
                    value={selectedDevice}
                    onChange={(e) => setSelectedDevice(e.target.value)}
                    className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="">All Devices</option>
                    {devices?.map((device) => (
                      <option key={device.id} value={device.id}>
                        {device.name}
                      </option>
                    ))}
                  </select>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search messages..."
                      className="pl-10 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6">
              {messages?.messages && messages.messages.length > 0 ? (
                <div className="space-y-4">
                  {messages.messages.map((message) => (
                    <div
                      key={message.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="flex-shrink-0">
                              <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                                <MessageSquare className="h-4 w-4 text-gray-600" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-900">
                                  {message.phoneNumber}
                                </span>
                                <span
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                    message.status
                                  )}`}
                                >
                                  {getStatusIcon(message.status)}
                                  <span className="ml-1 capitalize">{message.status}</span>
                                </span>
                              </div>
                              <p className="text-xs text-gray-500">
                                Device: {devices?.find(d => d.id === message.deviceId)?.name || 'Unknown'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="ml-11">
                            <p className="text-sm text-gray-900 mb-2">{message.content}</p>
                            {message.caption && (
                              <p className="text-sm text-gray-600 italic mb-2">
                                Caption: {message.caption}
                              </p>
                            )}
                            
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {new Date(message.sentAt).toLocaleString()}
                              </span>
                              {message.messageType !== 'text' && (
                                <span className="flex items-center">
                                  <Paperclip className="h-3 w-3 mr-1" />
                                  {message.messageType}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex-shrink-0">
                          <button className="text-gray-400 hover:text-gray-600">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No messages</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Start sending messages to see them here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
