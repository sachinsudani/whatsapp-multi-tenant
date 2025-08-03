import React from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  Smartphone,
  MessageSquare,
  Users,
  UserPlus,
  TrendingUp,
  Activity,
} from "lucide-react";

const DashboardPage: React.FC = () => {
  const { user, userGroup, tenant } = useAuth();

  const stats = [
    {
      name: "Active Devices",
      value: "3",
      icon: Smartphone,
      change: "+12%",
      changeType: "positive" as const,
    },
    {
      name: "Messages Sent",
      value: "1,234",
      icon: MessageSquare,
      change: "+8%",
      changeType: "positive" as const,
    },
    {
      name: "Total Contacts",
      value: "567",
      icon: Users,
      change: "+5%",
      changeType: "positive" as const,
    },
    {
      name: "Active Groups",
      value: "12",
      icon: UserPlus,
      change: "+2%",
      changeType: "positive" as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back, {user?.firstName}! Here's what's happening with your
          WhatsApp API.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div key={item.name} className="card">
            <div className="card-content">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <item.icon className="h-6 w-6 text-gray-400" />
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
                            ? "text-success-600"
                            : "text-error-600"
                        }`}
                      >
                        <TrendingUp className="self-center flex-shrink-0 h-4 w-4" />
                        <span className="sr-only">
                          {item.changeType === "positive"
                            ? "Increased"
                            : "Decreased"}{" "}
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

      {/* Recent Activity */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Activity</h3>
          <p className="card-description">
            Latest messages and device activities
          </p>
        </div>
        <div className="card-content">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-primary-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  Message sent to +1234567890
                </p>
                <p className="text-sm text-gray-500">2 minutes ago</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-success-100 flex items-center justify-center">
                  <Smartphone className="h-4 w-4 text-success-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  Device "iPhone 14" connected
                </p>
                <p className="text-sm text-gray-500">5 minutes ago</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-warning-100 flex items-center justify-center">
                  <Users className="h-4 w-4 text-warning-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  New contact "John Doe" added
                </p>
                <p className="text-sm text-gray-500">10 minutes ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tenant Info */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Tenant Information</h3>
        </div>
        <div className="card-content">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Tenant Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{tenant?.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">User Role</dt>
              <dd className="mt-1 text-sm text-gray-900 capitalize">
                {userGroup?.groupType}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">User Email</dt>
              <dd className="mt-1 text-sm text-gray-900">{user?.email}</dd>
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
