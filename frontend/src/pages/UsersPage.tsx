import React from "react";

const UsersPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage users and their permissions
        </p>
      </div>

      <div className="card">
        <div className="card-content">
          <p className="text-gray-500">User management coming soon...</p>
        </div>
      </div>
    </div>
  );
};

export default UsersPage;
