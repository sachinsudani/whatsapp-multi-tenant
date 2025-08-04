import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { groupsAPI, whatsappAPI } from "../lib/api";
import {
  UserPlus,
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  MessageSquare,
  RefreshCw,
  X,
  Settings,
  UserMinus,
  Send,
  BarChart3,
} from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";

const groupSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  description: z.string().optional(),
});

type GroupForm = z.infer<typeof groupSchema>;

const GroupsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [newMemberPhone, setNewMemberPhone] = useState("");
  
  const queryClient = useQueryClient();

  const { data: groups, isLoading: groupsLoading, refetch: refetchGroups } = useQuery({
    queryKey: ["groups"],
    queryFn: groupsAPI.getGroups,
    refetchInterval: 60000,
  });

  const { data: devices } = useQuery({
    queryKey: ["devices"],
    queryFn: whatsappAPI.getDevices,
  });

  const createGroupMutation = useMutation({
    mutationFn: groupsAPI.createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setShowCreateModal(false);
      resetCreateForm();
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: GroupForm }) =>
      groupsAPI.updateGroup(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setShowUpdateModal(false);
      setSelectedGroup(null);
      resetUpdateForm();
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: groupsAPI.deleteGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });

  const addParticipantMutation = useMutation({
    mutationFn: ({ id, phoneNumber }: { id: string; phoneNumber: string }) =>
      groupsAPI.addParticipant(id, phoneNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setNewMemberPhone("");
    },
  });

  const removeParticipantMutation = useMutation({
    mutationFn: ({ id, phoneNumber }: { id: string; phoneNumber: string }) =>
      groupsAPI.removeParticipant(id, phoneNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: whatsappAPI.sendMessage,
  });

  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    formState: { errors: createErrors },
    reset: resetCreateForm,
  } = useForm<GroupForm>({
    resolver: zodResolver(groupSchema),
  });

  const {
    register: registerUpdate,
    handleSubmit: handleSubmitUpdate,
    formState: { errors: updateErrors },
    reset: resetUpdateForm,
    setValue: setUpdateValue,
  } = useForm<GroupForm>({
    resolver: zodResolver(groupSchema),
  });

  const onCreateSubmit = (data: GroupForm) => {
    createGroupMutation.mutate(data);
  };

  const onUpdateSubmit = (data: GroupForm) => {
    if (selectedGroup) {
      updateGroupMutation.mutate({ id: selectedGroup.id, data });
    }
  };

  const handleDeleteGroup = (groupId: string, groupName: string) => {
    if (window.confirm(`Are you sure you want to delete "${groupName}"?`)) {
      deleteGroupMutation.mutate(groupId);
    }
  };

  const handleEditGroup = (group: any) => {
    setSelectedGroup(group);
    setUpdateValue("name", group.name);
    setUpdateValue("description", group.description || "");
    setShowUpdateModal(true);
  };

  const handleManageMembers = (group: any) => {
    setSelectedGroup(group);
    setShowMembersModal(true);
  };

  const handleAddMember = () => {
    if (selectedGroup && newMemberPhone.trim()) {
      addParticipantMutation.mutate({
        id: selectedGroup.id,
        phoneNumber: newMemberPhone.trim(),
      });
    }
  };

  const handleRemoveMember = (phoneNumber: string) => {
    if (selectedGroup && window.confirm(`Remove ${phoneNumber} from group?`)) {
      removeParticipantMutation.mutate({
        id: selectedGroup.id,
        phoneNumber,
      });
    }
  };

  const handleSendGroupMessage = (groupId: string) => {
    const connectedDevice = devices?.find(d => d.status === 'connected');
    if (!connectedDevice) {
      alert('No connected devices available.');
      return;
    }

    const message = prompt('Enter message to send to group:');
    if (message) {
      sendMessageMutation.mutate({
        to: groupId,
        content: message,
        deviceId: connectedDevice.id,
      });
    }
  };

  const filteredGroups = groups?.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (groupsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your WhatsApp groups ({filteredGroups.length} groups)
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => refetchGroups()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Group
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Groups Grid */}
      {filteredGroups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((group) => (
            <div key={group.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                      <UserPlus className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{group.name}</h3>
                      <p className="text-sm text-gray-500">{group.description || 'No description'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditGroup(group)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group.id, group.name)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Members</span>
                    <span className="text-sm text-gray-900">
                      {group.participants?.length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Created</span>
                    <span className="text-sm text-gray-900">
                      {new Date(group.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex space-x-2">
                  <button
                    onClick={() => handleSendGroupMessage(group.id)}
                    className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message
                  </button>
                  <button
                    onClick={() => handleManageMembers(group)}
                    className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Members
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <UserPlus className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {searchTerm ? 'No groups found' : 'No groups'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm 
              ? 'Try adjusting your search terms.'
              : 'Get started by creating your first group.'
            }
          </p>
          {!searchTerm && (
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Group
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" />
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
              <form onSubmit={handleSubmitCreate(onCreateSubmit)}>
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Create New Group</h3>
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Group Name *</label>
                      <input
                        type="text"
                        {...registerCreate("name")}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      />
                      {createErrors.name && (
                        <p className="mt-1 text-sm text-red-600">{createErrors.name.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <textarea
                        {...registerCreate("description")}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createGroupMutation.isPending}
                    className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                  >
                    {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Members Modal */}
      {showMembersModal && selectedGroup && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" />
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
              <div className="px-6 py-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Manage Members - {selectedGroup.name}
                  </h3>
                  <button
                    onClick={() => {
                      setShowMembersModal(false);
                      setSelectedGroup(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Add Member */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Add New Member</h4>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMemberPhone}
                      onChange={(e) => setNewMemberPhone(e.target.value)}
                      placeholder="Phone number (e.g., +1234567890)"
                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                    <button
                      onClick={handleAddMember}
                      disabled={addParticipantMutation.isPending || !newMemberPhone.trim()}
                      className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Members List */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Current Members ({selectedGroup.participants?.length || 0})
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedGroup.participants?.map((participant: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-900">{participant}</span>
                        <button
                          onClick={() => handleRemoveMember(participant)}
                          disabled={removeParticipantMutation.isPending}
                          className="text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          <UserMinus className="h-4 w-4" />
                        </button>
                      </div>
                    )) || (
                      <p className="text-sm text-gray-500 text-center py-4">No members yet</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupsPage;