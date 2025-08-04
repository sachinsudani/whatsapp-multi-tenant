import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserPlus,
  Search,
  RefreshCw,
  Users,
  MessageSquare,
  Edit,
  Trash2,
  Plus,
  X,
  MoreVertical,
  Calendar,
  Settings,
  UserMinus,
} from 'lucide-react';
import { groupsAPI } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';

const GroupsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    participants: [] as string[],
  });
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
  });
  const [newParticipant, setNewParticipant] = useState('');

  const queryClient = useQueryClient();

  // Fetch groups
  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ['groups', searchTerm],
    queryFn: () => groupsAPI.getGroups(),
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: groupsAPI.createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        description: '',
        participants: [],
      });
    },
  });

  // Update group mutation
  const updateGroupMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      groupsAPI.updateGroup(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setShowEditModal(false);
      setSelectedGroup(null);
    },
  });

  // Delete group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: groupsAPI.deleteGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  // Add participant mutation
  const addParticipantMutation = useMutation({
    mutationFn: ({ id, phoneNumber }: { id: string; phoneNumber: string }) =>
      groupsAPI.addParticipant(id, phoneNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setNewParticipant('');
    },
  });

  // Remove participant mutation
  const removeParticipantMutation = useMutation({
    mutationFn: ({ id, phoneNumber }: { id: string; phoneNumber: string }) =>
      groupsAPI.removeParticipant(id, phoneNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    createGroupMutation.mutate(createForm);
  };

  const handleUpdateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGroup) {
      updateGroupMutation.mutate({ id: selectedGroup.id, data: editForm });
    }
  };

  const handleDeleteGroup = (groupId: string, groupName: string) => {
    if (window.confirm(`Are you sure you want to delete "${groupName}"?`)) {
      deleteGroupMutation.mutate(groupId);
    }
  };

  const handleEditGroup = (group: any) => {
    setSelectedGroup(group);
    setEditForm({
      name: group.name || '',
      description: group.description || '',
    });
    setShowEditModal(true);
  };

  const handleViewParticipants = (group: any) => {
    setSelectedGroup(group);
    setShowParticipantsModal(true);
  };

  const handleAddParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGroup && newParticipant.trim()) {
      addParticipantMutation.mutate({
        id: selectedGroup.id,
        phoneNumber: newParticipant.trim(),
      });
    }
  };

  const handleRemoveParticipant = (phoneNumber: string) => {
    if (selectedGroup && window.confirm(`Remove ${phoneNumber} from the group?`)) {
      removeParticipantMutation.mutate({
        id: selectedGroup.id,
        phoneNumber,
      });
    }
  };

  const filteredGroups = groups?.filter((group) =>
    group.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
          <h1 className="text-3xl font-bold text-gray-900">Groups</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your WhatsApp groups ({filteredGroups.length} groups)
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['groups'] })}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Group
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search groups by name or description..."
              className="w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Groups Grid */}
      {filteredGroups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((group) => (
            <div
              key={group.id}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                        <Users className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {group.name || 'Unnamed Group'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {group.participants?.length || 0} participants
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleViewParticipants(group)}
                      className="text-gray-400 hover:text-gray-600"
                      title="View Participants"
                    >
                      <Users className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEditGroup(group)}
                      className="text-gray-400 hover:text-gray-600"
                      title="Edit Group"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group.id, group.name)}
                      className="text-gray-400 hover:text-red-600"
                      disabled={deleteGroupMutation.isPending}
                      title="Delete Group"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {group.description && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {group.description}
                    </p>
                  </div>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-xs text-gray-500">
                    <Calendar className="h-3 w-3 mr-1" />
                    Created: {group.createdAt ? new Date(group.createdAt).toLocaleDateString() : 'Unknown'}
                  </div>
                  {group.lastMessageAt && (
                    <div className="flex items-center text-xs text-gray-500">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Last message: {new Date(group.lastMessageAt).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div className="flex space-x-2">
                  <button className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message
                  </button>
                  <button className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
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
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleCreateGroup}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Create New Group
                    </h3>
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
                      <label className="block text-sm font-medium text-gray-700">
                        Group Name *
                      </label>
                      <input
                        type="text"
                        value={createForm.name}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter group name"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        value={createForm.description}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        placeholder="Group description (optional)"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Initial Participants
                      </label>
                      <textarea
                        value={createForm.participants.join('\n')}
                        onChange={(e) => setCreateForm(prev => ({ 
                          ...prev, 
                          participants: e.target.value.split('\n').filter(p => p.trim())
                        }))}
                        rows={4}
                        placeholder="Enter phone numbers (one per line)&#10;e.g.,&#10;+1234567890&#10;+0987654321"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Enter phone numbers with country code, one per line
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={createGroupMutation.isPending}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {createGroupMutation.isPending ? (
                      <>
                        <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Create Group
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Group Modal */}
      {showEditModal && selectedGroup && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleUpdateGroup}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Edit Group
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setSelectedGroup(null);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Group Name *
                      </label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={updateGroupMutation.isPending}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {updateGroupMutation.isPending ? (
                      <>
                        <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                        Updating...
                      </>
                    ) : (
                      "Update Group"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedGroup(null);
                    }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Participants Modal */}
      {showParticipantsModal && selectedGroup && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Group Participants - {selectedGroup.name}
                  </h3>
                  <button
                    onClick={() => {
                      setShowParticipantsModal(false);
                      setSelectedGroup(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Add Participant Form */}
                <form onSubmit={handleAddParticipant} className="mb-6">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newParticipant}
                      onChange={(e) => setNewParticipant(e.target.value)}
                      placeholder="Enter phone number with country code"
                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                    <button
                      type="submit"
                      disabled={addParticipantMutation.isPending || !newParticipant.trim()}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                    >
                      {addParticipantMutation.isPending ? (
                        <RefreshCw className="animate-spin h-4 w-4" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </form>

                {/* Participants List */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-900">
                    Participants ({selectedGroup.participants?.length || 0})
                  </h4>
                  {selectedGroup.participants && selectedGroup.participants.length > 0 ? (
                    <div className="space-y-2">
                      {selectedGroup.participants.map((participant: string, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <Users className="h-4 w-4 text-gray-600" />
                            </div>
                            <span className="text-sm text-gray-900">{participant}</span>
                          </div>
                          <button
                            onClick={() => handleRemoveParticipant(participant)}
                            className="text-red-600 hover:text-red-800"
                            title="Remove participant"
                          >
                            <UserMinus className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No participants in this group.</p>
                  )}
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