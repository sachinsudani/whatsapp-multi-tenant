import { CheckCircle, Clock, QrCode, RefreshCw, Smartphone, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { whatsappAPI } from "../lib/api";

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrData: any;
  deviceName?: string;
  deviceId?: string;
  sessionId?: string; // New prop for session-based flow
  onRefresh?: () => void;
  onStatusCheck?: () => void;
  isRefreshing?: boolean;
  onConnectionSuccess?: (deviceId: string) => void; // New callback for successful connection
}

const QRModal: React.FC<QRModalProps> = ({ 
  isOpen, 
  onClose, 
  qrData, 
  deviceName = "WhatsApp Device",
  sessionId,
  onRefresh,
  onConnectionSuccess,
  isRefreshing = false 
}) => {
  const [connectionStatus, setConnectionStatus] = useState<'waiting' | 'connecting' | 'connected' | 'failed'>('waiting');
  const [statusMessage, setStatusMessage] = useState('Waiting for QR scan...');
  const [connectedDeviceId, setConnectedDeviceId] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [hasShownSuccess, setHasShownSuccess] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('QRModal render - isOpen:', isOpen);
    console.log('QRModal render - qrData:', qrData);
    console.log('QRModal render - sessionId:', sessionId);
    
    if (isOpen) {
      console.log('QRModal opened with data:', { qrData, sessionId, deviceName });
      console.log('QRModal props:', { isOpen, qrData, sessionId, deviceName });
    }
  }, [isOpen, qrData, sessionId, deviceName]);

  // Poll for connection status when sessionId is provided
  useEffect(() => {
    if (!isOpen || !sessionId) return;

    // Wait 3 seconds before starting to poll to give user time to scan
    const startPolling = setTimeout(() => {
      const pollStatus = async () => {
        try {
          const status = await whatsappAPI.checkQRConnectionStatus(sessionId);
          
          if (status.connected && status.deviceId) {
            setConnectionStatus('connected');
            setStatusMessage('Device connected successfully!');
            setConnectedDeviceId(status.deviceId);
            
            // Stop polling
            if (pollingInterval) {
              clearInterval(pollingInterval);
              setPollingInterval(null);
            }

            // Call success callback after 2 seconds
            if (status.deviceId && onConnectionSuccess) {
              setTimeout(() => {
                onConnectionSuccess(status.deviceId!);
              }, 2000);
            }
          } else {
            // If not connected but session exists, show connecting status
            setConnectionStatus('connecting');
            setStatusMessage('Processing connection...');
          }
        } catch (error) {
          console.error('Error checking connection status:', error);
        }
      };

      // Start polling every 3 seconds (slower to give more time)
      const interval = setInterval(pollStatus, 3000);
      setPollingInterval(interval);

      // Initial check
      pollStatus();
    }, 3000); // Wait 3 seconds before starting to poll

    return () => {
      clearTimeout(startPolling);
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [isOpen, sessionId, onConnectionSuccess]);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
      setConnectionStatus('waiting');
      setStatusMessage('Waiting for QR scan...');
      setConnectedDeviceId(null);
      setHasShownSuccess(false); // Reset success state on close
    }
  }, [isOpen]);

  // Show QR code when it's available
  useEffect(() => {
    if (qrData?.qrCode) {
      setConnectionStatus('waiting');
      setStatusMessage('Scan the QR code with your WhatsApp');
    }
  }, [qrData]);

  // Update status message based on connection status
  useEffect(() => {
    if (connectionStatus === 'connected') {
        setStatusMessage('Connection successful!');
        // Only show success message once
        if (!hasShownSuccess) {
            setHasShownSuccess(true);
            // Auto-close modal after 3 seconds
            setTimeout(() => {
                onClose();
                if (onConnectionSuccess && connectedDeviceId) {
                    onConnectionSuccess(connectedDeviceId);
                }
            }, 3000);
        }
    } else if (connectionStatus === 'connecting') {
        setStatusMessage('Processing connection...');
    } else if (connectionStatus === 'waiting') {
        setStatusMessage('Waiting for QR scan...');
    }
  }, [connectionStatus, hasShownSuccess, onClose, onConnectionSuccess]);

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'connecting':
        return <Clock className="h-8 w-8 text-yellow-500 animate-pulse" />;
      case 'failed':
        return <X className="h-8 w-8 text-red-500" />;
      default:
        return <QrCode className="h-8 w-8 text-blue-500" />;
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'connecting':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-4 relative">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Smartphone className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Connect WhatsApp</h3>
                    <p className="text-xs text-white/90">{deviceName}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-white/80 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              {/* Connection Status */}
              <div className={`mb-4 p-3 rounded-lg border ${getStatusColor()} transition-all duration-300`}>
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {getStatusIcon()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{statusMessage}</p>
                    {connectionStatus === 'waiting' && (
                      <p className="text-xs opacity-80 mt-1">Point your phone camera at the QR code</p>
                    )}
                    {connectionStatus === 'connecting' && (
                      <p className="text-xs opacity-80 mt-1">Establishing secure connection...</p>
                    )}
                    {connectionStatus === 'connected' && (
                      <p className="text-xs opacity-80 mt-1">Device ready to send messages!</p>
                    )}
                  </div>
                </div>
              </div>

              {/* QR Code */}
              {qrData?.qrCode && (
                <div className="text-center mb-4">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="relative inline-block">
                      <img
                        src={qrData.qrCode}
                        alt="QR Code"
                        className="mx-auto max-w-full h-48 w-48 object-contain rounded-lg shadow-sm border-2 border-white"
                        onError={(e) => {
                          console.error('QR image failed to load:', e);
                        }}
                        onLoad={() => {
                          console.log('QR image loaded successfully');
                        }}
                      />
                      {/* Subtle QR Code Glow */}
                      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-400/10 to-purple-400/10 animate-pulse pointer-events-none"></div>
                    </div>
                    
                    <div className="space-y-2 mt-3">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                        <p className="text-xs font-medium text-gray-700">
                          Open WhatsApp on your phone
                        </p>
                      </div>
                      <div className="bg-white rounded-md p-2 border border-gray-200">
                        <p className="text-xs text-gray-600">
                          📱 <span className="font-semibold">Settings</span> → <span className="font-semibold">Linked Devices</span> → <span className="font-semibold">Link a Device</span>
                        </p>
                      </div>
                      {qrData.expiresAt && (
                        <div className="flex items-center justify-center space-x-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>Expires: {new Date(qrData.expiresAt).toLocaleTimeString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Success State */}
              {connectionStatus === 'connected' && (
                <div className="text-center mb-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                    <div className="relative">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2 animate-bounce" />
                    </div>
                    <h4 className="text-base font-semibold text-green-800 mb-1">
                      Successfully Connected! 🎉
                    </h4>
                    <p className="text-xs text-green-600">
                      Your WhatsApp device is now ready to send messages.
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-2">
                {connectionStatus !== 'connected' && onRefresh && (
                  <button
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-gray-300 text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200"
                  >
                    {isRefreshing ? (
                      <RefreshCw className="animate-spin h-3 w-3 mr-1" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-1" />
                    )}
                    Refresh QR
                  </button>
                )}
                
                <button
                  onClick={onClose}
                  className={`flex-1 inline-flex justify-center items-center px-3 py-2 border border-transparent text-xs font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    connectionStatus === 'connected'
                      ? 'text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 focus:ring-green-500'
                      : 'text-gray-700 bg-gray-100 hover:bg-gray-200 focus:ring-gray-500'
                  }`}
                >
                  {connectionStatus === 'connected' ? '🎉 Done' : 'Cancel'}
                </button>
              </div>

              {/* Progress Indicator */}
              {connectionStatus === 'waiting' && sessionId && (
                <div className="mt-3">
                  <div className="flex items-center justify-center space-x-2 text-xs text-gray-600">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="font-medium">Waiting for connection...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QRModal; 