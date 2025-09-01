// Geocoding utilities for JanMat
// Provides functions to work with GPS coordinates and mapping services

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface GeocodingResult {
  formattedAddress: string;
  components: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
}

/**
 * Generate URLs for different mapping services
 */
export const generateMapUrls = (latitude: number, longitude: number) => {
  return {
    googleMaps: `https://www.google.com/maps?q=${latitude},${longitude}`,
    googleMapsEmbed: `https://www.google.com/maps/embed/v1/view?key=YOUR_API_KEY&center=${latitude},${longitude}&zoom=15`,
    openStreetMap: `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}&zoom=16`,
    appleMaps: `https://maps.apple.com/?q=${latitude},${longitude}`,
    directions: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
    streetView: `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${latitude},${longitude}`,
    satelliteView: `https://www.google.com/maps/@${latitude},${longitude},18z/data=!3m1!1e3`,
  };
};

/**
 * Calculate distance between two GPS coordinates (Haversine formula)
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  
  return distance;
};

/**
 * Convert degrees to radians
 */
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Format coordinates for display
 */
export const formatCoordinates = (
  latitude: number,
  longitude: number,
  precision: number = 6
): string => {
  return `${latitude.toFixed(precision)}, ${longitude.toFixed(precision)}`;
};

/**
 * Convert GPS coordinates to DMS (Degrees, Minutes, Seconds) format
 */
export const toDMS = (latitude: number, longitude: number) => {
  const convertToDMS = (coordinate: number, isLatitude: boolean) => {
    const absolute = Math.abs(coordinate);
    const degrees = Math.floor(absolute);
    const minutesFloat = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = (minutesFloat - minutes) * 60;
    
    const direction = isLatitude
      ? coordinate >= 0 ? 'N' : 'S'
      : coordinate >= 0 ? 'E' : 'W';
    
    return `${degrees}° ${minutes}' ${seconds.toFixed(2)}" ${direction}`;
  };
  
  return {
    latitude: convertToDMS(latitude, true),
    longitude: convertToDMS(longitude, false),
    formatted: `${convertToDMS(latitude, true)}, ${convertToDMS(longitude, false)}`
  };
};

/**
 * Validate GPS coordinates
 */
export const validateCoordinates = (latitude: number, longitude: number): boolean => {
  return (
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
};

/**
 * Get current user location (requires permission)
 */
export const getCurrentLocation = (): Promise<Location> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
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
        let message = 'Unable to get location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out';
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

/**
 * Reverse geocoding - convert coordinates to address (requires geocoding service)
 * This is a placeholder that could be implemented with services like:
 * - Google Geocoding API
 * - OpenCage Geocoding API
 * - Nominatim (OpenStreetMap)
 */
export const reverseGeocode = async (
  latitude: number,
  longitude: number
): Promise<GeocodingResult | null> => {
  try {
    // Using Nominatim (free, no API key required)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
    );
    
    if (!response.ok) {
      throw new Error('Geocoding service unavailable');
    }
    
    const data = await response.json();
    
    return {
      formattedAddress: data.display_name || `${latitude}, ${longitude}`,
      components: {
        street: data.address?.road,
        city: data.address?.city || data.address?.town || data.address?.village,
        state: data.address?.state,
        country: data.address?.country,
        postalCode: data.address?.postcode,
      },
    };
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    return null;
  }
};

/**
 * Create a shareable location link
 */
export const createLocationShareLink = (
  latitude: number,
  longitude: number,
  title?: string
): string => {
  const coords = `${latitude},${longitude}`;
  const titleParam = title ? `&title=${encodeURIComponent(title)}` : '';
  return `${window.location.origin}/location?coords=${coords}${titleParam}`;
};

/**
 * Check if coordinates are within a specific area (bounding box)
 */
export const isWithinBounds = (
  latitude: number,
  longitude: number,
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }
): boolean => {
  return (
    latitude <= bounds.north &&
    latitude >= bounds.south &&
    longitude <= bounds.east &&
    longitude >= bounds.west
  );
};
