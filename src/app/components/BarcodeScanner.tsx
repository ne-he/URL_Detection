import { useState, useRef } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { Camera, Upload, X } from 'lucide-react';

interface BarcodeScannerProps {
  onScanSuccess: (url: string) => void;
}

export function BarcodeScanner({ onScanSuccess }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  const startCameraScanning = () => {
    setError(null);
    setIsScanning(true);

    // Clean up any existing scanner
    if (scannerRef.current) {
      scannerRef.current.clear();
    }

    setTimeout(() => {
      if (scannerContainerRef.current) {
        scannerRef.current = new Html5QrcodeScanner(
          "qr-reader",
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            supportedScanTypes: []
          },
          false
        );

        scannerRef.current.render(
          (decodedText) => {
            onScanSuccess(decodedText);
            stopScanning();
          },
          (errorMessage) => {
            // Ignore errors during scanning
          }
        );
      }
    }, 100);
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    
    try {
      const html5QrCode = new Html5Qrcode("qr-file-reader");
      const result = await html5QrCode.scanFile(file, true);
      onScanSuccess(result);
      
      // Clean up
      html5QrCode.clear();
    } catch (err) {
      setError('Could not detect barcode/QR code in the image. Please try another image.');
      console.error('Scan error:', err);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Barcode/QR Scanner</h2>
        <p className="text-gray-600">Scan or upload a barcode/QR code to extract the link</p>
      </div>

      {/* Action Buttons */}
      {!isScanning && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <button
            onClick={startCameraScanning}
            className="flex items-center justify-center gap-3 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition"
          >
            <Camera className="w-5 h-5" />
            Scan with Camera
          </button>
          
          <label className="flex items-center justify-center gap-3 px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition cursor-pointer">
            <Upload className="w-5 h-5" />
            Upload Image
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
        </div>
      )}

      {/* Scanner Container */}
      {isScanning && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-600">Position the barcode/QR code in the frame</p>
            <button
              onClick={stopScanning}
              className="flex items-center gap-2 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition"
            >
              <X className="w-4 h-4" />
              Stop
            </button>
          </div>
          <div 
            id="qr-reader" 
            ref={scannerContainerRef}
            className="rounded-lg overflow-hidden"
          ></div>
        </div>
      )}

      {/* Hidden element for file scanning */}
      <div id="qr-file-reader" className="hidden"></div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 rounded-lg p-4">
        <p className="text-sm text-blue-700">
          <strong>Tip:</strong> This scanner supports both QR codes and various barcode formats. 
          Make sure the code is clear and well-lit for best results.
        </p>
      </div>
    </div>
  );
}
