import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MessageSquare,
  Smartphone,
  Users,
  UserPlus,
  Send,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { whatsappAPI, contactsAPI, groupsAPI } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';

const DashboardPage: React.FC = () => {
  // Fetch dashboard data
  const { data: devices, isLoading: devicesLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: whatsappAPI.getDevices,
  });

  const { data: contacts, isLoading: contactsLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: contactsAPI.getContacts,
  });

  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: groupsAPI.getGroups,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages'],
    queryFn: () => whatsappAPI.getMessages({ limit: 10 }),
  });

  if (devicesLoading || contactsLoading || groupsLoading || messagesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  // Calculate statistics
  const totalDevices = devices?.length || 0;
  const connectedDevices = devices?.filter(d => d.status === 'connected').length || 0;
  const totalContacts = contacts?.length || 0;
  const totalGroups = groups?.length || 0;
  const totalMessages = messages?.messages?.length || 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-600 bg-green-100';
      case 'connecting':
        return 'text-yellow-600 bg-yellow-100';
      case 'disconnected':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4" />;
      case 'connecting':
        return <Clock className="h-4 w-4" />;
      case 'disconnected':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome to your WhatsApp Multi-Tenant Dashboard
          </p>
        </div>
        <div className="flex space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
            <Send className="h-4 w-4 mr-2" />
            Send Message
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Devices Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-md bg-blue-500 flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Devices</p>
              <p className="text-2xl font-semibold text-gray-900">{totalDevices}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm">
              <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600">{connectedDevices} connected</span>
            </div>
          </div>
        </div>

        {/* Contacts Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-md bg-green-500 flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Contacts</p>
              <p className="text-2xl font-semibold text-gray-900">{totalContacts}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm">
              <UserPlus className="h-4 w-4 text-blue-500 mr-1" />
              <span className="text-blue-600">Manage contacts</span>
            </div>
          </div>
        </div>

        {/* Groups Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-md bg-purple-500 flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Groups</p>
              <p className="text-2xl font-semibold text-gray-900">{totalGroups}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm">
              <MessageSquare className="h-4 w-4 text-purple-500 mr-1" />
              <span className="text-purple-600">Group chats</span>
            </div>
          </div>
        </div>

        {/* Messages Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-md bg-orange-500 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Recent Messages</p>
              <p className="text-2xl font-semibold text-gray-900">{totalMessages}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-orange-500 mr-1" />
              <span className="text-orange-600">Last 24h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Device Status Overview */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Device Status Overview</h3>
        </div>
        <div className="p-6">
          {devices && devices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <Smartphone className="h-4 w-4 text-gray-600" />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{device.name}</h4>
                        <p className="text-xs text-gray-500">
                          {device.messagesSent || 0} messages sent
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        device.status
                      )}`}
                    >
                      {getStatusIcon(device.status)}
                      <span className="ml-1 capitalize">{device.status}</span>
                    </span>
                  </div>
                  {device.lastConnectedAt && (
                    <div className="mt-2 text-xs text-gray-500">
                      Last seen: {new Date(device.lastConnectedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Smartphone className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No devices</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding your first WhatsApp device.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
        </div>
        <div className="p-6">
          {messages?.messages && messages.messages.length > 0 ? (
            <div className="space-y-4">
              {messages.messages.slice(0, 5).map((message) => (
                <div key={message.id} className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-gray-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      Message sent to {message.phoneNumber}
                    </p>
                    <p className="text-sm text-gray-500 truncate">{message.content}</p>
                  </div>
                  <div className="flex-shrink-0 text-sm text-gray-500">
                    {new Date(message.sentAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No recent messages</h3>
              <p className="mt-1 text-sm text-gray-500">
                Start sending messages to see activity here.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
              <Smartphone className="h-5 w-5 mr-2" />
              Add Device
            </button>
            <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
              <Users className="h-5 w-5 mr-2" />
              Add Contact
            </button>
            <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
              <MessageSquare className="h-5 w-5 mr-2" />
              Send Message
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
