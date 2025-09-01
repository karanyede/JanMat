import React from 'react';
import { MapPin, ExternalLink, Navigation, Copy } from 'lucide-react';
import { generateMapUrls, formatCoordinates } from '../lib/geocoding';

interface LocationMapProps {
  latitude: number;
  longitude: number;
  location?: string;
  title?: string;
  showDirections?: boolean;
}

const LocationMap: React.FC<LocationMapProps> = ({ 
  latitude, 
  longitude, 
  location, 
  title = "Issue Location",
  showDirections = true 
}) => {
  // Generate map URLs using the utility
  const mapUrls = generateMapUrls(latitude, longitude);
  
  // Create embedded map URL (using OpenStreetMap with Leaflet)
  const leafletMapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude-0.01},${latitude-0.01},${longitude+0.01},${latitude+0.01}&layer=mapnik&marker=${latitude}%2C${longitude}`;

  const handleOpenInMaps = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const copyCoordinates = () => {
    const coordinates = formatCoordinates(latitude, longitude);
    navigator.clipboard.writeText(coordinates).then(() => {
      alert('Coordinates copied to clipboard!');
    });
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
      {/* Header */}
      <div className="bg-gray-800 text-white p-3">
        <h4 className="font-medium flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          {title}
        </h4>
        {location && (
          <p className="text-sm text-gray-300 mt-1">{location}</p>
        )}
      </div>

      {/* Map Display */}
      <div className="relative">
        <iframe
          src={leafletMapUrl}
          width="100%"
          height="250"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          className="w-full"
        ></iframe>
        
        {/* Overlay with coordinates */}
        <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
          {formatCoordinates(latitude, longitude)}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 bg-gray-50">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => handleOpenInMaps(mapUrls.googleMaps)}
            className="flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Google Maps</span>
          </button>
          
          <button
            onClick={() => handleOpenInMaps(mapUrls.openStreetMap)}
            className="flex items-center justify-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            <MapPin className="w-4 h-4" />
            <span>OpenStreetMap</span>
          </button>
          
          {showDirections && (
            <button
              onClick={() => handleOpenInMaps(mapUrls.directions)}
              className="flex items-center justify-center space-x-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
            >
              <Navigation className="w-4 h-4" />
              <span>Directions</span>
            </button>
          )}
          
          <button
            onClick={copyCoordinates}
            className="flex items-center justify-center space-x-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
          >
            <Copy className="w-4 h-4" />
            <span>Copy GPS</span>
          </button>
        </div>

        {/* Additional Info */}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Click the buttons above to view this location in different mapping services or copy coordinates
          </p>
        </div>
      </div>
    </div>
  );
};

export default LocationMap;
