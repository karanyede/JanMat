import React, { useRef, useEffect, useState } from 'react';

const CameraTest: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const [permissions, setPermissions] = useState<{
    camera: PermissionState | 'unknown';
    location: PermissionState | 'unknown';
  }>({ camera: 'unknown', location: 'unknown' });

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      // Check camera permission
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

  const testCamera = async () => {
    try {
      setError('');
      console.log('🎥 Testing camera access...');
      
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
      console.error('❌ Camera test failed:', err);
      setError(`Camera test failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const testLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        alert(`Location test successful: ${position.coords.latitude}, ${position.coords.longitude}`);
      },
      (error) => {
        alert(`Location test failed: ${error.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
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

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Camera & Location Test</h1>
      
      {/* Permissions Status */}
      <div className="bg-white p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-2">Permissions Status</h2>
        <p>Camera: <span className={`font-bold ${permissions.camera === 'granted' ? 'text-green-600' : 'text-red-600'}`}>
          {permissions.camera}
        </span></p>
        <p>Location: <span className={`font-bold ${permissions.location === 'granted' ? 'text-green-600' : 'text-red-600'}`}>
          {permissions.location}
        </span></p>
      </div>

      {/* Test Buttons */}
      <div className="flex gap-4 mb-6">
        <button 
          onClick={testCamera}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          disabled={!!stream}
        >
          Test Camera
        </button>
        <button 
          onClick={testLocation}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
        >
          Test Location
        </button>
        <button 
          onClick={stopCamera}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
          disabled={!stream}
        >
          Stop Camera
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Video Display */}
      <div className="bg-black rounded-lg overflow-hidden">
        <video 
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full max-w-2xl h-96 object-cover"
          style={{ minHeight: '300px' }}
        />
      </div>

      {/* Browser Info */}
      <div className="mt-6 bg-white p-4 rounded-lg text-sm">
        <h3 className="font-semibold mb-2">Browser Info</h3>
        <p>User Agent: {navigator.userAgent}</p>
        <p>Has getUserMedia: {!!navigator.mediaDevices?.getUserMedia ? 'Yes' : 'No'}</p>
        <p>Has Geolocation: {!!navigator.geolocation ? 'Yes' : 'No'}</p>
        <p>Is HTTPS: {window.location.protocol === 'https:' ? 'Yes' : 'No'}</p>
      </div>
    </div>
  );
};

export default CameraTest;
