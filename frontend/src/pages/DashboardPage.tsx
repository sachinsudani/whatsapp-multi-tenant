import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  MessageSquare,
  RefreshCw,
  Send,
  Smartphone,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import React, { useState } from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import { useAuth } from "../contexts/AuthContext";
import { contactsAPI, groupsAPI, whatsappAPI } from "../lib/api";

const DashboardPage: React.FC = () => {
  const { user, userGroup, tenant } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch real-time data
  const {
    data: devices,
    isLoading: devicesLoading,
    refetch: refetchDevices,
  } = useQuery({
    queryKey: ["devices"],
    queryFn: whatsappAPI.getDevices,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const {
    data: messagesData,
    isLoading: messagesLoading,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ["messages"],
    queryFn: () => whatsappAPI.getMessages({ limit: 10 }),
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  const {
    data: contacts,
    isLoading: contactsLoading,
    refetch: refetchContacts,
  } = useQuery({
    queryKey: ["contacts"],
    queryFn: contactsAPI.getContacts,
    refetchInterval: 60000, // Refresh every minute
  });

  const {
    data: groups,
    isLoading: groupsLoading,
    refetch: refetchGroups,
  } = useQuery({
    queryKey: ["groups"],
    queryFn: groupsAPI.getGroups,
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: messageStats, isLoading: statsLoading } = useQuery({
    queryKey: ["messageStats"],
    queryFn: () => whatsappAPI.getMessageStats({ period: "24h" }),
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchDevices(),
        refetchMessages(),
        refetchContacts(),
        refetchGroups(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate stats
  const activeDevices =
    devices?.filter((d) => d.status === "connected").length || 0;
  const totalDevices = devices?.length || 0;
  const totalMessages = messagesData?.total || 0;
  const totalContacts = contacts?.length || 0;
  const totalGroups = groups?.length || 0;
  const recentMessages = messagesData?.messages || [];

  const stats = [
    {
      name: "Active Devices",
      value: `${activeDevices}/${totalDevices}`,
      icon: Smartphone,
      change: activeDevices > 0 ? "+100%" : "0%",
      changeType: activeDevices > 0 ? "positive" : "neutral",
      color: activeDevices > 0 ? "text-green-600" : "text-gray-600",
      bgColor: activeDevices > 0 ? "bg-green-100" : "bg-gray-100",
    },
    {
      name: "Messages Today",
      value: messageStats?.today || "0",
      icon: MessageSquare,
      change: messageStats?.todayChange || "0%",
      changeType: messageStats?.todayChange?.startsWith("+")
        ? "positive"
        : "neutral",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      name: "Total Contacts",
      value: totalContacts.toString(),
      icon: Users,
      change: "+5%",
      changeType: "positive",
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      name: "Active Groups",
      value: totalGroups.toString(),
      icon: UserPlus,
      change: "+2%",
      changeType: "positive",
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ];

  const getDeviceStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "connecting":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "disconnected":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getMessageStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "text-green-600 bg-green-100";
      case "delivered":
        return "text-blue-600 bg-blue-100";
      case "read":
        return "text-purple-600 bg-purple-100";
      case "failed":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  if (devicesLoading || messagesLoading || contactsLoading || groupsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, {user?.firstName}! Here's your WhatsApp API overview.
          </p>
        </div>
        <button
          onClick={handleRefreshAll}
          disabled={refreshing}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh All
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div
            key={item.name}
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`p-2 rounded-md ${item.bgColor}`}>
                    <item.icon className={`h-6 w-6 ${item.color}`} />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {item.name}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {item.value}
                      </div>
                      <div
                        className={`ml-2 flex items-baseline text-sm font-semibold ${
                          item.changeType === "positive"
                            ? "text-green-600"
                            : item.changeType === "negative"
                            ? "text-red-600"
                            : "text-gray-600"
                        }`}
                      >
                        {item.changeType === "positive" && (
                          <TrendingUp className="self-center flex-shrink-0 h-4 w-4" />
                        )}
                        <span className="sr-only">
                          {item.changeType === "positive"
                            ? "Increased"
                            : "Changed"}{" "}
                          by
                        </span>
                        {item.change}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Status */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Device Status
              </h3>
              <Smartphone className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              {devices && devices.length > 0 ? (
                devices.map((device) => (
                  <div
                    key={device.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      {getDeviceStatusIcon(device.status)}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {device.name}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {device.status}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {device.lastSeen
                        ? new Date(device.lastSeen).toLocaleTimeString()
                        : "Never"}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <Smartphone className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">
                    No devices configured
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Messages */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Recent Messages
              </h3>
              <MessageSquare className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              {recentMessages.length > 0 ? (
                recentMessages.slice(0, 5).map((message) => (
                  <div
                    key={message.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Send className="h-4 w-4 text-blue-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          To: {message.to}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {message.content?.substring(0, 50)}...
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getMessageStatusColor(
                          message.status
                        )}`}
                      >
                        {message.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(message.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">
                    No recent messages
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Recent Activity
            </h3>
            <Activity className="h-5 w-5 text-gray-400" />
          </div>
          <div className="flow-root">
            <ul className="-mb-8">
              {recentMessages.slice(0, 3).map((message, idx) => (
                <li key={message.id}>
                  <div className="relative pb-8">
                    {idx !== 2 && (
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" />
                    )}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
                          <MessageSquare className="h-4 w-4 text-white" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-500">
                            Message sent to{" "}
                            <span className="font-medium text-gray-900">
                              {message.to}
                            </span>
                          </p>
                        </div>
                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                          {new Date(message.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Tenant Info */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Account Information
          </h3>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Tenant Name</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {tenant?.name || "N/A"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">User Role</dt>
              <dd className="mt-1 text-sm text-gray-900 capitalize">
                {userGroup?.groupType || "N/A"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">User Email</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {user?.email || "N/A"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Last Login</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {user?.lastLoginAt
                  ? new Date(user.lastLoginAt).toLocaleString()
                  : "Never"}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
