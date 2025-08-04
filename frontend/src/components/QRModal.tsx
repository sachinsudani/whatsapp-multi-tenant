import { X } from "lucide-react";
import React from "react";

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrData: any;
  deviceName?: string;
  deviceId?: string;
  onRefresh?: () => void;
  onStatusCheck?: () => void;
  isRefreshing?: boolean;
}

const QRModal: React.FC<QRModalProps> = ({ isOpen, onClose, qrData }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Scan QR Code</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="text-center">
          {qrData?.qrCode ? (
            <div>
              <img
                src={qrData.qrCode}
                alt="QR Code"
                className="mx-auto mb-4 max-w-full"
              />
              <p className="text-sm text-gray-600">
                Scan this QR code with your WhatsApp to connect the device
              </p>
              {qrData.expiresAt && (
                <p className="text-xs text-gray-500 mt-2">
                  Expires: {new Date(qrData.expiresAt).toLocaleTimeString()}
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-500">Loading QR code...</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRModal; 