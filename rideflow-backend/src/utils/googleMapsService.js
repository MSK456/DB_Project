/**
 * @file src/utils/googleMapsService.js
 * @description Wrapper for Google Maps API calls (Geocoding, Distance Matrix).
 *              ALL calls using the server-side key go through here.
 */

import { Client } from '@googlemaps/google-maps-services-js';

const client = new Client({});
const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

/**
 * Geocode an address string → { lat, lng, formattedAddress, city, country }
 */
export const geocodeAddress = async (address) => {
  try {
    if (!API_KEY || API_KEY === 'your_server_side_key_here') {
      console.warn('Google Maps API Key not configured. Skipping geocoding.');
      return null;
    }

    // Detect if the address is actually a coordinate string (e.g. "33.7003, 73.0381")
    const coordMatch = address.match(/^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/);
    
    const params = coordMatch 
      ? { latlng: address, key: API_KEY } 
      : { address, key: API_KEY };

    const response = await client.geocode({
      params,
      timeout: 5000,
    });

    if (response.data.status !== 'OK' || !response.data.results.length) {
      console.error(`Geocoding failed for: "${address}" | Status: ${response.data.status}`);
      
      // Fallback: If it was a coordinate pair, return it even if geocoding failed
      if (coordMatch) {
        const [lat, lng] = address.split(',').map(v => parseFloat(v.trim()));
        return {
          lat,
          lng,
          formattedAddress: address,
          city: 'Unknown', // Fallback city to allow ride creation
          country: null,
        };
      }
      return null;
    }

    const result = response.data.results[0];
    const location = result.geometry.location;

    // Extract city from address components
    const cityComponent = result.address_components.find(c =>
      c.types.includes('locality') || c.types.includes('administrative_area_level_2')
    );
    const countryComponent = result.address_components.find(c =>
      c.types.includes('country')
    );

    return {
      lat: location.lat,
      lng: location.lng,
      formattedAddress: result.formatted_address,
      city: cityComponent?.long_name || null,
      country: countryComponent?.long_name || null,
    };
  } catch (error) {
    console.error('Geocoding error:', error.message);
    
    // Final Fallback: If it was a coordinate pair, return it even on error
    const coordMatch = address.match(/^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/);
    if (coordMatch) {
      const [lat, lng] = address.split(',').map(v => parseFloat(v.trim()));
      return {
        lat,
        lng,
        formattedAddress: address,
        city: 'Unknown',
        country: null,
      };
    }
    return null;
  }
};

/**
 * Get real driving distance and duration between two coordinate pairs
 */
export const getDrivingDistance = async (originLat, originLng, destLat, destLng) => {
  try {
    if (!API_KEY || API_KEY === 'your_server_side_key_here') {
      console.warn('Google Maps API Key not configured. Using defaults.');
      return null;
    }

    const response = await client.distancematrix({
      params: {
        origins: [`${originLat},${originLng}`],
        destinations: [`${destLat},${destLng}`],
        mode: 'driving',
        departure_time: 'now',
        traffic_model: 'best_guess',
        key: API_KEY,
      },
      timeout: 8000,
    });

    const element = response.data.rows[0]?.elements[0];

    if (!element || element.status !== 'OK') {
      console.error('Distance Matrix failed | Status:', element?.status);
      return null;
    }

    return {
      distanceKm: parseFloat((element.distance.value / 1000).toFixed(2)),
      durationMinutes: Math.ceil(element.duration_in_traffic?.value / 60 || element.duration.value / 60),
      durationMinutesNoTraffic: Math.ceil(element.duration.value / 60),
      distanceText: element.distance.text,
      durationText: element.duration_in_traffic?.text || element.duration.text,
    };
  } catch (error) {
    console.error('Distance Matrix error:', error.message);
    
    // Final Fallback: Haversine distance (straight line) + 25% for road curves
    const deg2rad = (deg) => deg * (Math.PI / 180);
    const R = 6371; // Earth radius
    const dLat = deg2rad(destLat - originLat);
    const dLon = deg2rad(destLng - originLng);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(deg2rad(originLat)) * Math.cos(deg2rad(destLat)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightDistance = R * c;
    const estimatedRoadDistance = parseFloat((straightDistance * 1.25).toFixed(2)); // 1.25 multiplier for roads
    
    return {
      distanceKm: estimatedRoadDistance,
      durationMinutes: Math.ceil(estimatedRoadDistance * 2), // 2 mins per km avg
      durationMinutesNoTraffic: Math.ceil(estimatedRoadDistance * 2),
      distanceText: `${estimatedRoadDistance} km`,
      durationText: `${Math.ceil(estimatedRoadDistance * 2)} mins`,
    };
  }
};

/**
 * Build SQL fragment for proximity search (Haversine formula)
 */
export const buildProximityQuery = (lat, lng, radiusKm = 15) => {
  return {
    haversineSelect: `(6371 * ACOS(
        COS(RADIANS(?)) * COS(RADIANS(d.latitude)) *
        COS(RADIANS(d.longitude) - RADIANS(?)) +
        SIN(RADIANS(?)) * SIN(RADIANS(d.latitude))
      )) AS distance_km`,
    haversineHaving: `HAVING distance_km <= ?`,
    params: [lat, lng, lat, radiusKm],
  };
};
