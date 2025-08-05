import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Plus,
    RefreshCw,
    Smartphone,
    Trash2
} from "lucide-react";
import React, { useState } from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import QRModal from "../components/QRModal";
import { whatsappAPI } from "../lib/api";

const DevicesPage: React.FC = () => {
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQrData] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isNewDeviceFlow, setIsNewDeviceFlow] = useState(false);

  const queryClient = useQueryClient();

  console.log('DevicesPage rendering...');
  console.log('Modal state:', { showQRModal, qrData, sessionId, isNewDeviceFlow });

  // Fetch devices
  const {
    data: devices,
    isLoading: devicesLoading,
  } = useQuery({
    queryKey: ["devices"],
    queryFn: whatsappAPI.getDevices,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  console.log('Devices data:', devices);
  console.log('Devices loading:', devicesLoading);

  // New QR generation mutation for improved flow
  const generateQRForNewDeviceMutation = useMutation({
    mutationFn: () => {
      console.log('Starting QR generation...');
      return whatsappAPI.generateQRForNewDevice({
        deviceName: `WhatsApp Device ${new Date().toLocaleTimeString()}`,
        description: "Auto-generated device"
      });
    },
    onSuccess: (data) => {
      console.log('QR generation success:', data);
      console.log('Setting QR data:', data);
      console.log('Setting session ID:', data.sessionId);
      setQrData(data);
      setSessionId(data.sessionId);
      setIsNewDeviceFlow(true);
      setShowQRModal(true);
      console.log('Modal should now be open, qrData:', data);
    },
    onError: (error: any) => {
      console.error('Failed to generate QR:', error);
      console.error('Error details:', error.response?.data || error.message);
      alert('Failed to generate QR code. Please try again.');
    }
  });

  // Delete device mutation
  const deleteDeviceMutation = useMutation({
    mutationFn: whatsappAPI.deleteDevice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });

  // Generate QR mutation (for existing devices)
  const generateQRMutation = useMutation({
    mutationFn: whatsappAPI.generateQR,
    onSuccess: (data) => {
      setQrData(data);
      setSessionId(null);
      setIsNewDeviceFlow(false);
      setShowQRModal(true);
    },
  });

  // Handle successful connection for new device
  const handleConnectionSuccess = () => {
    setShowQRModal(false);
    setQrData(null);
    setSessionId(null);
    setIsNewDeviceFlow(false);
    
    // Refresh devices list to show the new connected device
    queryClient.invalidateQueries({ queryKey: ["devices"] });
    
    // Show success message
    alert('Device connected successfully!');
  };

  const handleDeleteDevice = (deviceId: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete this device? This action cannot be undone.`
      )
    ) {
      deleteDeviceMutation.mutate(deviceId);
    }
  };

  const handleReconnectDevice = (deviceId: string) => {
    generateQRMutation.mutate(deviceId);
  };

  const handleAddDevice = () => {
    console.log('=== ADD DEVICE BUTTON CLICKED ===');
    console.log('Add Device button clicked');
    console.log('User authenticated:', !!localStorage.getItem('accessToken'));
    console.log('Access token exists:', localStorage.getItem('accessToken') ? 'Yes' : 'No');
    console.log('Mutation pending:', generateQRForNewDeviceMutation.isPending);
    
    // Generate QR immediately without any form
    generateQRForNewDeviceMutation.mutate();
  };

  if (devicesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">WhatsApp Devices</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Manage your connected WhatsApp devices and send messages
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>{devices?.length || 0} devices</span>
                </div>
                <button
                  onClick={handleAddDevice}
                  disabled={generateQRForNewDeviceMutation.isPending}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors duration-200"
                >
                  {generateQRForNewDeviceMutation.isPending ? (
                    <>
                      <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                      Generating QR...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Device
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {devicesLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="flex items-center space-x-2">
              <RefreshCw className="animate-spin h-5 w-5 text-blue-600" />
              <span className="text-gray-600">Loading devices...</span>
            </div>
          </div>
        ) : devices && devices.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {devices.map((device) => (
              <div
                key={device.id}
                className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
              >
                {/* Device Header */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        device.status === 'connected' ? 'bg-green-500' :
                        device.status === 'connecting' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}></div>
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {device.name}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        device.status === 'connected' ? 'bg-green-100 text-green-800' :
                        device.status === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {device.status}
                      </span>
                    </div>
                  </div>
                  {device.description && (
                    <p className="mt-1 text-xs text-gray-500 truncate">
                      {device.description}
                    </p>
                  )}
                </div>

                {/* Device Stats */}
                <div className="px-4 py-3 bg-gray-50">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-gray-500">Messages Sent</p>
                      <p className="font-semibold text-gray-900">{device.messagesSent}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Messages Received</p>
                      <p className="font-semibold text-gray-900">{device.messagesReceived}</p>
                    </div>
                  </div>
                </div>

                {/* Device Actions */}
                <div className="px-4 py-3 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      {device.lastConnectedAt && (
                        <span>Last seen: {new Date(device.lastConnectedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {device.status === 'disconnected' && (
                        <button
                          onClick={() => handleReconnectDevice(device.id)}
                          className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors duration-200"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Reconnect
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteDevice(device.id)}
                        className="inline-flex items-center px-2 py-1 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-1 focus:ring-red-500 transition-colors duration-200"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <Smartphone className="h-12 w-12" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No devices</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding your first WhatsApp device.
            </p>
            <div className="mt-6">
              <button
                onClick={handleAddDevice}
                disabled={generateQRForNewDeviceMutation.isPending}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors duration-200"
              >
                {generateQRForNewDeviceMutation.isPending ? (
                  <>
                    <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                    Generating QR...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Device
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* QR Modal */}
      <QRModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        qrData={qrData}
        deviceName={qrData?.deviceName || "WhatsApp Device"}
        sessionId={sessionId || undefined}
        onConnectionSuccess={handleConnectionSuccess}
      />
    </div>
  );
};

export default DevicesPage;
