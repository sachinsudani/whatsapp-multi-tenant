import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    AlertCircle,
    CheckCircle,
    Clock,
    Edit,
    Plus,
    QrCode,
    RefreshCw,
    Smartphone,
    Trash2,
    Wifi,
    X,
} from "lucide-react";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import LoadingSpinner from "../components/LoadingSpinner";
import QRModal from "../components/QRModal";
import { whatsappAPI } from "../lib/api";

// Form validation schemas
const createDeviceSchema = z.object({
  name: z.string().min(1, "Device name is required"),
  description: z.string().optional(),
});

const updateDeviceSchema = z.object({
  name: z.string().min(1, "Device name is required"),
  description: z.string().optional(),
});

type CreateDeviceForm = z.infer<typeof createDeviceSchema>;
type UpdateDeviceForm = z.infer<typeof updateDeviceSchema>;

const DevicesPage: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [qrData, setQrData] = useState<any>(null);

  const queryClient = useQueryClient();

  // Fetch devices
  const {
    data: devices,
    isLoading: devicesLoading,
    refetch: refetchDevices,
  } = useQuery({
    queryKey: ["devices"],
    queryFn: whatsappAPI.getDevices,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Create device mutation
  const createDeviceMutation = useMutation({
    mutationFn: whatsappAPI.createDevice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      setShowCreateModal(false);
      resetCreateForm();
    },
  });

  // Update device mutation
  const updateDeviceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDeviceForm }) =>
      whatsappAPI.updateDevice(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      setShowUpdateModal(false);
      setSelectedDevice(null);
      resetUpdateForm();
    },
  });

  // Delete device mutation
  const deleteDeviceMutation = useMutation({
    mutationFn: whatsappAPI.deleteDevice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });

  // Generate QR mutation
  const generateQRMutation = useMutation({
    mutationFn: whatsappAPI.generateQR,
    onSuccess: (data) => {
      setQrData(data);
      setShowQRModal(true);
    },
  });

  // Get device status mutation
  const getDeviceStatusMutation = useMutation({
    mutationFn: whatsappAPI.getDeviceStatus,
    onSuccess: () => {
      refetchDevices();
    },
  });

  // Form handling for create
  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    formState: { errors: createErrors },
    reset: resetCreateForm,
  } = useForm<CreateDeviceForm>({
    resolver: zodResolver(createDeviceSchema),
  });

  // Form handling for update
  const {
    register: registerUpdate,
    handleSubmit: handleSubmitUpdate,
    formState: { errors: updateErrors },
    reset: resetUpdateForm,
    setValue: setUpdateValue,
  } = useForm<UpdateDeviceForm>({
    resolver: zodResolver(updateDeviceSchema),
  });

  const onCreateSubmit = (data: CreateDeviceForm) => {
    createDeviceMutation.mutate(data);
  };

  const onUpdateSubmit = (data: UpdateDeviceForm) => {
    if (selectedDevice) {
      updateDeviceMutation.mutate({ id: selectedDevice.id, data });
    }
  };

  const handleDeleteDevice = (deviceId: string, deviceName: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${deviceName}"? This action cannot be undone.`
      )
    ) {
      deleteDeviceMutation.mutate(deviceId);
    }
  };

  const handleEditDevice = (device: any) => {
    setSelectedDevice(device);
    setUpdateValue("name", device.name);
    setUpdateValue("description", device.description || "");
    setShowUpdateModal(true);
  };

  const handleGenerateQR = (device: any) => {
    setSelectedDevice(device);
    generateQRMutation.mutate(device.id);
  };

  const handleCheckStatus = (deviceId: string) => {
    getDeviceStatusMutation.mutate(deviceId);
  };

  const handleRefreshQR = () => {
    if (selectedDevice) {
      generateQRMutation.mutate(selectedDevice.id);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "connecting":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "disconnected":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "text-green-600 bg-green-100";
      case "connecting":
        return "text-yellow-600 bg-yellow-100";
      case "disconnected":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  if (devicesLoading) {
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
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp Devices</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your WhatsApp devices and connections ({devices?.length || 0}{" "}
            devices)
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => refetchDevices()}
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
            Add Device
          </button>
        </div>
      </div>

      {/* WAHA Service Status */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <Wifi className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">WAHA Service</h3>
              <p className="text-sm text-gray-500">WhatsApp HTTP API service status</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
              Online
            </span>
            <a
              href="http://localhost:3001/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Dashboard →
            </a>
          </div>
        </div>
      </div>

      {/* Devices Grid */}
      {devices && devices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.map((device) => (
            <div
              key={device.id}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <Smartphone className="h-5 w-5 text-primary-600" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {device.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {device.description || "No description"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditDevice(device)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteDevice(device.id, device.name)}
                      className="text-gray-400 hover:text-red-600"
                      disabled={deleteDeviceMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Status</span>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        device.status
                      )}`}
                    >
                      {getStatusIcon(device.status)}
                      <span className="ml-1 capitalize">{device.status}</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Last Seen</span>
                    <span className="text-sm text-gray-900">
                      {device.lastConnectedAt
                        ? new Date(device.lastConnectedAt).toLocaleString()
                        : "Never"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Messages</span>
                    <span className="text-sm text-gray-900">
                      {device.messagesSent || 0} sent
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex space-x-2">
                  {device.status !== "connected" && (
                    <button
                      onClick={() => handleGenerateQR(device)}
                      disabled={generateQRMutation.isPending}
                      className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                    >
                      {generateQRMutation.isPending ? (
                        <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                      ) : (
                        <QrCode className="h-4 w-4 mr-2" />
                      )}
                      Connect
                    </button>
                  )}
                  <button
                    onClick={() => handleCheckStatus(device.id)}
                    disabled={getDeviceStatusMutation.isPending}
                    className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {getDeviceStatusMutation.isPending ? (
                      <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Status
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Smartphone className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No devices</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding your first WhatsApp device.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Device
            </button>
          </div>
        </div>
      )}

      {/* Create Device Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmitCreate(onCreateSubmit)}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Add New Device
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
                        Device Name *
                      </label>
                      <input
                        type="text"
                        {...registerCreate("name")}
                        placeholder="e.g., iPhone 14, Samsung Galaxy"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      />
                      {createErrors.name && (
                        <p className="mt-1 text-sm text-red-600">
                          {createErrors.name.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        {...registerCreate("description")}
                        rows={3}
                        placeholder="Optional description for this device"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={createDeviceMutation.isPending}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {createDeviceMutation.isPending ? (
                      <>
                        <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Device
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

      {/* Update Device Modal */}
      {showUpdateModal && selectedDevice && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmitUpdate(onUpdateSubmit)}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Update Device
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setShowUpdateModal(false);
                        setSelectedDevice(null);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Device Name *
                      </label>
                      <input
                        type="text"
                        {...registerUpdate("name")}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      />
                      {updateErrors.name && (
                        <p className="mt-1 text-sm text-red-600">
                          {updateErrors.name.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        {...registerUpdate("description")}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={updateDeviceMutation.isPending}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {updateDeviceMutation.isPending ? (
                      <>
                        <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                        Updating...
                      </>
                    ) : (
                      "Update Device"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUpdateModal(false);
                      setSelectedDevice(null);
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

      {/* QR Code Modal */}
      <QRModal
        isOpen={showQRModal}
        onClose={() => {
          setShowQRModal(false);
          setQrData(null);
          setSelectedDevice(null);
        }}
        qrData={qrData}
        deviceName={selectedDevice?.name || ""}
        deviceId={selectedDevice?.id || ""}
        onRefresh={handleRefreshQR}
        onStatusCheck={() => selectedDevice && handleCheckStatus(selectedDevice.id)}
        isRefreshing={generateQRMutation.isPending}
      />
    </div>
  );
};

export default DevicesPage;
