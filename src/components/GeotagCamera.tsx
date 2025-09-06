import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, RotateCcw, X, MapPin, CheckCircle } from "lucide-react";

interface GeotagCameraProps {
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

const GeotagCamera: React.FC<GeotagCameraProps> = ({ onCapture, onClose, maxPhotos = 4 }) => {
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [error, setError] = useState<string>("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [locationError, setLocationError] = useState<string>("");
  const [cameraStarted, setCameraStarted] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      // Check if geolocation is supported
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser. Please use a modern browser."));
        return;
      }

      // Check if we're on HTTPS or localhost (required for geolocation in production)
      const isSecure = window.location.protocol === 'https:' || 
                      window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';
      
      if (!isSecure && window.location.hostname !== 'janmat.vercel.app') {
        console.warn("⚠️ Geolocation requires HTTPS in production environments");
      }

      console.log("🌍 Requesting location permission...");

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("✅ Location obtained:", {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error("❌ Location error:", error);
          let message = "Unable to get location";
          let suggestion = "";
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = "Location access denied by user";
              suggestion = "Please enable location permissions in your browser settings and try again.";
              break;
            case error.POSITION_UNAVAILABLE:
              message = "Location information unavailable";
              suggestion = "Please check your device's location settings and internet connection.";
              break;
            case error.TIMEOUT:
              message = "Location request timed out";
              suggestion = "Please check your internet connection and try again.";
              break;
          }
          reject(new Error(`${message}. ${suggestion}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000, // Increased timeout for better reliability
          maximumAge: 600000, // 10 minutes cache
        }
      );
    });
  };

  const startCamera = useCallback(async () => {
    try {
      setError("");
      setLocationError("");
      setCameraStarted(true);
      setShowTroubleshooting(false);

      // Set timeout to show troubleshooting if camera doesn't start
      const troubleshootingTimeout = setTimeout(() => {
        if (!isStreamActive) {
          setShowTroubleshooting(true);
        }
      }, 5000);

      // Check location permissions first
      try {
        await getCurrentLocation();
        console.log("✅ Location access granted");
      } catch (locationErr) {
        clearTimeout(troubleshootingTimeout);
        setLocationError(locationErr instanceof Error ? locationErr.message : "Location access required");
        return;
      }

      console.log("🎥 Starting camera with facingMode:", facingMode);
      
      // Try different camera constraints for better compatibility
      const constraints = {
        video: {
          facingMode,
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
        },
        audio: false
      };

      console.log("📋 Camera constraints:", constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("✅ Camera stream obtained:", stream.getTracks());

      if (videoRef.current) {
        console.log("📺 Setting video source...");
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Multiple event listeners for better compatibility
        const activateVideo = () => {
          console.log("📺 Activating video display");
          setIsStreamActive(true);
          setShowTroubleshooting(false);
        };

        // Try multiple events that might indicate video is ready
        videoRef.current.onloadedmetadata = () => {
          console.log("📺 Video metadata loaded");
          console.log("📐 Video dimensions:", videoRef.current?.videoWidth, "x", videoRef.current?.videoHeight);
          activateVideo();
        };

        videoRef.current.onloadeddata = () => {
          console.log("📺 Video data loaded");
          activateVideo();
        };

        videoRef.current.oncanplay = () => {
          console.log("📺 Video can play");
          activateVideo();
        };

        videoRef.current.onplay = () => {
          console.log("📺 Video started playing");
          activateVideo();
        };
        
        // Force play the video
        const playVideo = async () => {
          try {
            if (videoRef.current) {
              await videoRef.current.play();
              console.log("▶️ Video playing successfully");
              activateVideo();
            }
          } catch (playError) {
            console.error("❌ Video play error:", playError);
            // Try to activate video anyway since stream exists
            activateVideo();
          }
        };

        // Try to play immediately
        setTimeout(playVideo, 100);
        
        // Fallback: Force activation after 2 seconds if stream exists
        setTimeout(() => {
          if (streamRef.current && !isStreamActive) {
            console.log("🔧 Forcing video activation after timeout");
            activateVideo();
          }
        }, 2000);

        videoRef.current.onerror = (error) => {
          console.error("❌ Video element error:", error);
          setError("Video display error. Please refresh and try again.");
        };
      }
    } catch (err) {
      console.error("❌ Camera access error:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(`Unable to access camera: ${errorMessage}`);
    }
  }, [facingMode, isStreamActive, setShowTroubleshooting]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreamActive(false);
  }, []);

  const switchCamera = useCallback(() => {
    stopCamera();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, [stopCamera]);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || capturedPhotos.length >= maxPhotos) {
      console.log("❌ Capture blocked:", {
        hasVideo: !!videoRef.current,
        hasCanvas: !!canvasRef.current,
        photoCount: capturedPhotos.length,
        maxPhotos
      });
      return;
    }

    console.log("📸 Starting photo capture...");
    setIsCapturing(true);

    try {
      // Get current location with retry logic
      let location;
      try {
        location = await getCurrentLocation();
        console.log("✅ Location obtained for photo:", location);
      } catch (locationError) {
        console.error("❌ Location failed for photo capture:", locationError);
        // Show user-friendly error but allow capture without location
        setLocationError("Location unavailable for this photo");
        // Use fallback location or continue without location
        location = { latitude: 0, longitude: 0 };
        
        // Ask user if they want to continue without location
        const continueWithoutLocation = confirm(
          "Location access failed. Would you like to capture the photo without location data?\n\n" +
          "Note: Photos without location may have limited functionality in issue reporting."
        );
        
        if (!continueWithoutLocation) {
          setIsCapturing(false);
          return;
        }
      }
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error("Could not get canvas context");
      }

      // Check if video is ready
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        throw new Error("Video not ready. Please wait for camera to fully load.");
      }

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      console.log("📐 Canvas dimensions:", canvas.width, "x", canvas.height);

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Add location and timestamp overlay (only if location is available)
      const timestamp = new Date().toLocaleString();
      const overlayHeight = 80;
      const overlayWidth = Math.min(450, canvas.width - 20);
      
      // Background for text
      context.fillStyle = 'rgba(0, 0, 0, 0.8)';
      context.fillRect(10, canvas.height - overlayHeight - 10, overlayWidth, overlayHeight);
      
      // Location text (show "Location unavailable" if no GPS)
      context.fillStyle = 'white';
      context.font = 'bold 16px Arial';
      if (location.latitude !== 0 && location.longitude !== 0) {
        context.fillText(
          `📍 ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`, 
          20, 
          canvas.height - overlayHeight + 25
        );
      } else {
        context.fillText('📍 Location unavailable', 20, canvas.height - overlayHeight + 25);
      }
      
      // Timestamp text
      context.font = '14px Arial';
      context.fillText(`🕒 ${timestamp}`, 20, canvas.height - overlayHeight + 50);
      
      // JanMat watermark
      context.font = 'bold 12px Arial';
      context.fillStyle = 'rgba(255, 255, 255, 0.7)';
      context.fillText('JanMat Verified', 20, canvas.height - 15);

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error("Failed to create image blob"));
          }
        }, 'image/jpeg', 0.9);
      });

      console.log("Photo captured successfully, blob size:", blob.size);

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
      console.log("Photo added to collection, total:", capturedPhotos.length + 1);

      // Show success feedback
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }

    } catch (err) {
      console.error("Capture error:", err);
      setError(err instanceof Error ? err.message : "Failed to capture photo");
    } finally {
      setIsCapturing(false);
    }
  }, [capturedPhotos.length, maxPhotos, onCapture]);

  const removePhoto = (id: string) => {
    setCapturedPhotos(prev => {
      const updated = prev.filter(photo => photo.id !== id);
      // Clean up URL
      const photoToRemove = prev.find(p => p.id === id);
      if (photoToRemove) {
        URL.revokeObjectURL(photoToRemove.url);
      }
      return updated;
    });
  };

  const handleClose = () => {
    stopCamera();
    // Clean up URLs
    capturedPhotos.forEach(photo => URL.revokeObjectURL(photo.url));
    onClose();
  };

  // Add keyboard support for easier photo capture
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (isStreamActive && event.code === 'Space') {
        event.preventDefault();
        capturePhoto();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isStreamActive, capturePhoto]);

  // Auto-start camera when component mounts (for better UX)
  useEffect(() => {
    console.log("🎬 GeotagCamera mounted, auto-starting camera...");
    const autoStartTimeout = setTimeout(() => {
      if (!streamRef.current && !locationError) {
        console.log("🔄 Auto-starting camera after 500ms");
        startCamera();
      }
    }, 500);

    return () => clearTimeout(autoStartTimeout);
  }, [startCamera, locationError]);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4">
        <div className="flex items-center justify-between text-white">
          <button onClick={handleClose} className="p-2 hover:bg-white/20 rounded-full">
            <X className="w-6 h-6" />
          </button>
          <div className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-green-400" />
            <span className="text-sm">GPS Location Required</span>
          </div>
          {isStreamActive && (
            <button onClick={switchCamera} className="p-2 hover:bg-white/20 rounded-full">
              <RotateCcw className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      {/* Error Messages */}
      {(error || locationError) && (
        <div className="absolute top-16 left-4 right-4 z-10 bg-red-600 text-white p-4 rounded-lg shadow-lg">
          <div className="font-medium mb-2">🚨 Camera Error</div>
          <div className="text-sm mb-3">{error || locationError}</div>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setError("");
                setLocationError("");
                startCamera();
              }}
              className="bg-white text-red-600 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100"
            >
              🔄 Retry
            </button>
            <button
              onClick={handleClose}
              className="bg-red-800 text-white px-3 py-1 rounded text-sm font-medium hover:bg-red-900"
            >
              ❌ Close
            </button>
          </div>
        </div>
      )}

      {/* Troubleshooting Panel */}
      {!isStreamActive && !error && !locationError && (
        <div className="absolute top-16 left-4 right-4 z-10 bg-blue-600 text-white p-4 rounded-lg shadow-lg">
          <div className="font-medium mb-2">🛠️ Troubleshooting</div>
          <div className="text-sm space-y-2">
            <div>✅ Location permissions granted</div>
            <div>🎥 Camera starting...</div>
            <div className="text-xs text-blue-200">
              If camera doesn't appear in 10 seconds, try refreshing the page or checking browser settings.
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col h-full">
        {!isStreamActive ? (
          // Start Camera Screen
          <div className="flex-1 flex items-center justify-center bg-gray-900">
            <div className="text-center text-white p-8">
              <div className="w-20 h-20 mx-auto mb-6 bg-blue-600 rounded-full flex items-center justify-center">
                <Camera className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Geotag Camera</h2>
              <p className="text-gray-300 mb-6 max-w-md mx-auto">
                This camera captures photos with GPS location data to verify issue locations. 
                Location access is required.
              </p>
              
              {/* Status Indicator */}
              <div className="mb-4 p-3 bg-blue-900/50 rounded-lg">
                <div className="text-sm text-blue-200">
                  🔧 Status: {streamRef.current ? "Stream connected" : cameraStarted ? "Starting..." : "Ready"}
                </div>
                {cameraStarted && !streamRef.current && (
                  <div className="text-xs text-yellow-300 mt-1">
                    Camera is starting... If this takes too long, click "Start Camera" manually.
                  </div>
                )}
              </div>
              
              <button
                onClick={startCamera}
                disabled={!!locationError}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-8 py-3 rounded-lg font-medium transition-colors mb-4"
              >
                🎥 Start Camera
              </button>
              
              {/* Quick Test Button */}
              <button
                onClick={async () => {
                  try {
                    const location = await getCurrentLocation();
                    alert(`Location test successful: ${location.latitude}, ${location.longitude}`);
                  } catch (error) {
                    alert(`Location test failed: ${error}`);
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors text-sm"
              >
                📍 Test GPS
              </button>
              {locationError && (
                <p className="text-red-400 text-sm mt-4">
                  Please enable location permissions in your browser settings
                </p>
              )}
            </div>
          </div>
        ) : (
          // Camera View
          <div className="flex-1 relative bg-gray-900 flex items-center justify-center min-h-[60vh]">
            {/* Video Element */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ 
                minHeight: '400px',
                maxHeight: '70vh',
                backgroundColor: '#1f2937'
              }}
              onLoadedMetadata={() => {
                console.log("Video loaded, dimensions:", videoRef.current?.videoWidth, "x", videoRef.current?.videoHeight);
                setIsStreamActive(true);
              }}
              onError={(e) => {
                console.error("Video error:", e);
                setError("Video display error. Please try restarting the camera.");
              }}
            />
            
            {/* Loading indicator while camera is starting */}
            {!streamRef.current && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90">
                <div className="text-center text-white">
                  <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-lg">Starting camera...</p>
                  <p className="text-sm text-gray-300">Please wait while we access your camera</p>
                  
                  {/* Troubleshooting panel after 5 seconds */}
                  {showTroubleshooting && (
                    <div className="mt-6 p-4 bg-yellow-600/90 rounded-lg max-w-sm mx-auto text-sm">
                      <h3 className="font-semibold mb-2">🔧 Troubleshooting</h3>
                      <p className="mb-3">Camera taking longer than expected to start.</p>
                      <div className="space-y-2">
                        <button
                          onClick={() => window.location.reload()}
                          className="w-full bg-yellow-700 hover:bg-yellow-800 text-white py-2 px-4 rounded"
                        >
                          🔄 Refresh Page
                        </button>
                        <button
                          onClick={startCamera}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
                        >
                          🎥 Retry Camera
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Manual Start Button (shown when stream not active and camera started) */}
            {!isStreamActive && cameraStarted && (
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
                <button
                  onClick={startCamera}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  🎥 Start Camera Manually
                </button>
              </div>
            )}
            
            {/* Debug Info */}
            <div className="absolute top-4 left-4 bg-black/90 text-white p-3 rounded text-sm max-w-xs">
              <div>🎥 Camera: {isStreamActive ? 'Active' : 'Inactive'}</div>
              <div>📸 Photos: {capturedPhotos.length}/{maxPhotos}</div>
              <div>🔄 Mode: {facingMode}</div>
              <div>📺 Video Size: {videoRef.current?.videoWidth || 0}x{videoRef.current?.videoHeight || 0}</div>
              <div>🔌 Stream: {streamRef.current ? 'Connected' : 'None'}</div>
              <div>▶️ Playing: {videoRef.current?.paused === false ? 'Yes' : 'No'}</div>
              
              {/* Force video display button */}
              {streamRef.current && !isStreamActive && (
                <button
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.style.display = 'block';
                      videoRef.current.play();
                      setIsStreamActive(true);
                      console.log("🔧 Force video display activated");
                    }
                  }}
                  className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white py-1 px-2 rounded text-xs"
                >
                  🔧 Force Video
                </button>
              )}
            </div>
            
            {/* Capture Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-8 border-2 border-white/50 rounded-lg">
                {/* Corner indicators */}
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-white"></div>
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-white"></div>
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-white"></div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-white"></div>
              </div>
              
              {/* Center crosshair */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8">
                <div className="w-full h-0.5 bg-white/70 absolute top-1/2 transform -translate-y-1/2"></div>
                <div className="h-full w-0.5 bg-white/70 absolute left-1/2 transform -translate-x-1/2"></div>
              </div>
            </div>

            {/* Floating capture button in center-bottom - Show if stream exists */}
            {streamRef.current && (
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 pointer-events-auto">
                <button
                  onClick={capturePhoto}
                  disabled={isCapturing || capturedPhotos.length >= maxPhotos}
                  className="w-24 h-24 bg-white rounded-full border-6 border-white shadow-2xl hover:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                  style={{ filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.4))' }}
                  title="Capture Photo"
                >
                  {isCapturing ? (
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <div className="w-20 h-20 bg-red-500 rounded-full border-4 border-white shadow-inner hover:bg-red-600 transition-colors">
                      <div className="w-full h-full flex items-center justify-center text-white font-bold text-xs">
                        SNAP
                      </div>
                    </div>
                  )}
                </button>
              </div>
            )}

            {/* Camera controls overlay */}
            <div className="absolute top-4 right-4 flex flex-col space-y-2">
              <button
                onClick={switchCamera}
                className="w-12 h-12 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-colors pointer-events-auto"
                title="Switch Camera"
              >
                <RotateCcw className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}

        {/* Bottom Controls - Show when stream exists */}
        {streamRef.current && (
          <div className="bg-black/95 p-4 border-t border-gray-700">
            {/* Photo Counter */}
            <div className="text-center mb-4">
              <span className="text-white text-lg font-medium">
                📸 {capturedPhotos.length} / {maxPhotos} photos taken
              </span>
            </div>

            {/* Main Capture Button Row */}
            <div className="flex justify-center items-center space-x-12 mb-4">
              {/* Switch Camera Button */}
              <button
                onClick={switchCamera}
                className="w-12 h-12 bg-gray-700 text-white rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors"
                title="Switch Camera"
              >
                <RotateCcw className="w-6 h-6" />
              </button>
              
              {/* Large Capture Button */}
              <button
                onClick={capturePhoto}
                disabled={isCapturing || capturedPhotos.length >= maxPhotos}
                className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 hover:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-2xl"
                title="Capture Photo"
              >
                {isCapturing ? (
                  <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <div className="w-16 h-16 bg-red-500 rounded-full border-2 border-white shadow-inner"></div>
                )}
              </button>

              {/* Photo Count Indicator */}
              <div className="w-12 h-12 flex items-center justify-center">
                {capturedPhotos.length > 0 && (
                  <div className="text-white text-center">
                    <CheckCircle className="w-8 h-8 mx-auto mb-1 text-green-400" />
                    <span className="text-sm font-bold">{capturedPhotos.length}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Alternative Capture Methods */}
            <div className="text-center mb-4">
              <button
                onClick={capturePhoto}
                disabled={isCapturing || capturedPhotos.length >= maxPhotos}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors text-sm"
              >
                {isCapturing ? 'Capturing...' : '📷 Tap to Capture'}
              </button>
            </div>

            {/* Captured Photos Preview */}
            {capturedPhotos.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-white text-sm font-medium text-center">Captured Photos:</h4>
                <div className="flex space-x-2 overflow-x-auto pb-2">
                  {capturedPhotos.map((photo) => (
                    <div key={photo.id} className="relative flex-shrink-0">
                      <img
                        src={photo.url}
                        alt="Captured"
                        className="w-16 h-16 object-cover rounded-lg border-2 border-green-400"
                      />
                      <button
                        onClick={() => removePhoto(photo.id)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="text-center mt-4">
              <p className="text-gray-300 text-xs">
                🎯 Tap the red circle, "Tap to Capture" button, or press SPACEBAR to take a photo
              </p>
              <p className="text-gray-400 text-xs mt-1">
                📱 Make sure your device camera is working and location is enabled
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Hidden canvas for photo processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default GeotagCamera;
