import React, { useRef, useEffect, useState } from 'react';

interface SimpleCameraCaptureProps {
  onCapture: (imageBlob: Blob, location: { latitude: number; longitude: number; timestamp: string }) => void;
  onClose: () => void;
  maxPhotos?: number;
}

interface CapturedPhoto {
  blob: Blob;
  url: string;
  location: { latitude: number; longitude: number; timestamp: string };
  id: string;
}

const SimpleCameraCapture: React.FC<SimpleCameraCaptureProps> = ({ onCapture, onClose, maxPhotos = 4 }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [permissions, setPermissions] = useState<{
    camera: PermissionState | 'unknown';
    location: PermissionState | 'unknown';
  }>({ camera: 'unknown', location: 'unknown' });

  useEffect(() => {
    checkPermissions();
    startCamera(); // Auto-start camera when component mounts
  }, []);

  const checkPermissions = async () => {
    try {
      if (navigator.permissions) {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        const locationPermission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        
        setPermissions({
          camera: cameraPermission.state,
          location: locationPermission.state
        });
      }
    } catch (err) {
      console.log('Permissions API not fully supported');
    }
  };

  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          let message = "Unable to get location";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = "Location access denied. Please enable location permissions.";
              break;
            case error.POSITION_UNAVAILABLE:
              message = "Location information unavailable.";
              break;
            case error.TIMEOUT:
              message = "Location request timed out.";
              break;
          }
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    });
  };

  const startCamera = async () => {
    try {
      setError('');
      console.log('🎥 Starting camera...');
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      console.log('✅ Camera stream obtained');
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        
        videoRef.current.onloadedmetadata = () => {
          console.log('📺 Video metadata loaded');
          videoRef.current?.play()
            .then(() => console.log('▶️ Video playing'))
            .catch(err => console.error('❌ Video play error:', err));
        };
      }
      
    } catch (err) {
      console.error('❌ Camera start failed:', err);
      setError(`Camera failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const capturePhoto = async () => {
    if (!stream || !videoRef.current || !canvasRef.current || isCapturing || capturedPhotos.length >= maxPhotos) {
      return;
    }

    try {
      setIsCapturing(true);
      console.log('📸 Capturing photo...');

      // Get current location
      const location = await getCurrentLocation();
      console.log('📍 Location obtained:', location);

      // Create canvas and capture frame
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Cannot get canvas context');
      }

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0);

      // Add location overlay
      const overlayHeight = 80;
      context.fillStyle = 'rgba(0, 0, 0, 0.7)';
      context.fillRect(0, canvas.height - overlayHeight, canvas.width, overlayHeight);
      
      // Location text
      context.fillStyle = 'white';
      context.font = '16px Arial';
      const locationText = `📍 ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
      context.fillText(locationText, 20, canvas.height - overlayHeight + 25);
      
      // Timestamp
      const timestamp = new Date().toLocaleString();
      context.font = '14px Arial';
      context.fillText(`🕒 ${timestamp}`, 20, canvas.height - overlayHeight + 50);
      
      // JanMat watermark
      context.font = 'bold 12px Arial';
      context.fillStyle = 'rgba(255, 255, 255, 0.7)';
      context.fillText('JanMat Verified', 20, canvas.height - 15);

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error("Failed to create image blob"));
          }
        }, 'image/jpeg', 0.9);
      });

      const photoData: CapturedPhoto = {
        blob,
        url: URL.createObjectURL(blob),
        location: {
          ...location,
          timestamp: new Date().toISOString(),
        },
        id: Date.now().toString() + Math.random(),
      };

      setCapturedPhotos(prev => [...prev, photoData]);
      
      // Call parent callback
      onCapture(blob, photoData.location);
      console.log('✅ Photo captured successfully');

      // Vibrate if supported
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }

    } catch (err) {
      console.error('❌ Photo capture failed:', err);
      setError(`Capture failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsCapturing(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  const testLocation = () => {
    getCurrentLocation()
      .then((location) => {
        alert(`Location test successful: ${location.latitude}, ${location.longitude}`);
      })
      .catch((error) => {
        alert(`Location test failed: ${error.message}`);
      });
  };

  const removePhoto = (id: string) => {
    setCapturedPhotos(prev => {
      const updated = prev.filter(photo => photo.id !== id);
      const photoToRemove = prev.find(p => p.id === id);
      if (photoToRemove) {
        URL.revokeObjectURL(photoToRemove.url);
      }
      return updated;
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      capturedPhotos.forEach(photo => URL.revokeObjectURL(photo.url));
    };
  }, []);

  // Keyboard shortcut - Space to capture
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'Space' && stream && !isCapturing) {
        event.preventDefault();
        capturePhoto();
      }
      if (event.code === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [stream, isCapturing, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 p-3 border-b border-gray-700 flex-shrink-0">
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-bold text-white">📷 Geotagged Camera</h1>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-300">
              📸 {capturedPhotos.length}/{maxPhotos}
            </div>
            <button 
              onClick={onClose}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm font-medium"
            >
              ✕ Close
            </button>
          </div>
        </div>
      </div>

      {/* Permissions Status */}
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex-shrink-0">
        <div className="flex space-x-6 text-sm">
          <div>
            Camera: <span className={`font-bold ${permissions.camera === 'granted' ? 'text-green-400' : 'text-red-400'}`}>
              {permissions.camera}
            </span>
          </div>
          <div>
            Location: <span className={`font-bold ${permissions.location === 'granted' ? 'text-green-400' : 'text-red-400'}`}>
              {permissions.location}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Camera View - 70% width */}
        <div className="flex-1 relative bg-black flex items-center justify-center" style={{ flex: '0 0 70%' }}>
          {/* Video Display */}
          <video 
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ maxHeight: 'calc(100vh - 120px)' }}
          />
          
          {/* Canvas for capture (hidden) */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Capture Overlay */}
          {stream && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-4 border-2 border-white/40 rounded-lg">
                {/* Corner indicators */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-white"></div>
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-white"></div>
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-white"></div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-white"></div>
              </div>
              
              {/* Center crosshair */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6">
                <div className="w-full h-0.5 bg-white/70 absolute top-1/2 transform -translate-y-1/2"></div>
                <div className="h-full w-0.5 bg-white/70 absolute left-1/2 transform -translate-x-1/2"></div>
              </div>
            </div>
          )}

          {/* Floating Capture Button */}
          {stream && (
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 pointer-events-auto">
              <button
                onClick={capturePhoto}
                disabled={isCapturing || capturedPhotos.length >= maxPhotos}
                className="w-16 h-16 bg-white rounded-full border-4 border-gray-300 hover:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-2xl"
                title="Capture Photo (Spacebar)"
              >
                {isCapturing ? (
                  <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <div className="w-12 h-12 bg-red-500 rounded-full border-2 border-white shadow-inner"></div>
                )}
              </button>
            </div>
          )}

          {/* Status overlay when no camera */}
          {!stream && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90">
              <div className="text-center text-white">
                <div className="w-16 h-16 mx-auto mb-4 bg-blue-600 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586l-.707-.707A1 1 0 0013 4H7a1 1 0 00-.707.293L5.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold mb-2">Camera Ready</h2>
                <p className="text-gray-300 text-sm">Click "Start Camera" to begin</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - 30% width */}
        <div className="bg-gray-800 border-l border-gray-700 overflow-y-auto" style={{ flex: '0 0 30%', minWidth: '300px' }}>
          <div className="p-4">
            {/* Control Buttons */}
            <div className="space-y-2 mb-6">
              <button 
                onClick={startCamera}
                className={`w-full px-4 py-2.5 rounded font-medium transition-colors ${
                  stream 
                    ? 'bg-green-600 text-white cursor-default' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                disabled={!!stream}
              >
                {stream ? '🎥 Camera Active' : '🎥 Start Camera'}
              </button>
              
              <button 
                onClick={testLocation}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded font-medium transition-colors"
              >
                📍 Test Location
              </button>
              
              <button 
                onClick={stopCamera}
                className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded font-medium transition-colors"
                disabled={!stream}
              >
                ⏹️ Stop Camera
              </button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-600 text-white p-3 rounded mb-4 text-sm">
                <div className="font-medium">⚠️ Error</div>
                <div className="mt-1">{error}</div>
              </div>
            )}

            {/* Captured Photos */}
            <div className="mb-6">
              <h3 className="text-white font-semibold mb-3 flex items-center">
                📸 Captured Photos ({capturedPhotos.length})
              </h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {capturedPhotos.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <div className="w-12 h-12 mx-auto mb-2 bg-gray-700 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-sm">No photos captured yet</p>
                  </div>
                ) : (
                  capturedPhotos.map((photo) => (
                    <div key={photo.id} className="bg-gray-700 rounded-lg p-3">
                      <img 
                        src={photo.url}
                        alt="Captured"
                        className="w-full h-24 object-cover rounded mb-2"
                      />
                      <div className="text-xs text-gray-300 space-y-1">
                        <div className="flex items-center">
                          <span className="text-green-400 mr-1">📍</span>
                          <span className="truncate">
                            {photo.location.latitude.toFixed(6)}, {photo.location.longitude.toFixed(6)}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-blue-400 mr-1">🕒</span>
                          <span>{new Date(photo.location.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-gray-400 mr-1">💾</span>
                          <span>{(photo.blob.size / 1024).toFixed(1)} KB</span>
                        </div>
                      </div>
                      <button
                        onClick={() => removePhoto(photo.id)}
                        className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white py-1.5 px-2 rounded text-xs font-medium transition-colors"
                      >
                        🗑️ Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="p-3 bg-gray-700 rounded text-sm text-gray-300 mb-4">
              <h4 className="font-semibold mb-2 text-white">📝 Instructions:</h4>
              <ul className="space-y-1 text-xs">
                <li>• Press <kbd className="bg-gray-600 px-1.5 py-0.5 rounded text-xs">Space</kbd> to capture</li>
                <li>• Press <kbd className="bg-gray-600 px-1.5 py-0.5 rounded text-xs">Esc</kbd> to close</li>
                <li>• Photos include GPS location</li>
                <li>• Maximum {maxPhotos} photos allowed</li>
              </ul>
            </div>

            {/* System Info */}
            <div className="p-3 bg-gray-700 rounded text-xs text-gray-400">
              <h4 className="font-semibold mb-2 text-gray-300">🔧 System Info:</h4>
              <div className="space-y-1">
                <div>Camera API: {!!navigator.mediaDevices?.getUserMedia ? 'Yes' : 'No'}</div>
                <div>Location API: {!!navigator.geolocation ? 'Yes' : 'No'}</div>
                <div>HTTPS: {window.location.protocol === 'https:' ? 'Yes' : 'No'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleCameraCapture;
