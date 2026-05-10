/**
 * @file src/components/maps/RideMap.jsx
 */

import { Map, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps';
import { useEffect } from 'react';
import RoutePolyline from './RoutePolyline';
import DriverMarker from './DriverMarker';

const DARK_MAP_STYLE = [
  { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#263c3f" }] },
  { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#6b9a76" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca5b3" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#746855" }] },
  { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#1f2835" }] },
  { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#f3d19c" }] },
  { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#2f3948" }] },
  { "featureType": "transit.station", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#515c6d" }] },
  { "featureType": "water", "elementType": "labels.text.stroke", "stylers": [{ "color": "#17263c" }] }
];

export default function RideMap({ pickup, dropoff, driverLocation, showRoute = true, onMapClick }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const bounds = new window.google.maps.LatLngBounds();
    let hasCoords = false;

    if (pickup?.lat) { bounds.extend(pickup); hasCoords = true; }
    if (dropoff?.lat) { bounds.extend(dropoff); hasCoords = true; }
    if (driverLocation?.lat) { bounds.extend(driverLocation); hasCoords = true; }

    if (hasCoords) {
      map.fitBounds(bounds, { top: 80, right: 80, bottom: 80, left: 80 });
    }
  }, [map, pickup, dropoff, driverLocation]);

  const handleInternalClick = (e) => {
    if (onMapClick && e.detail.latLng) {
      onMapClick(e.detail.latLng);
    }
  };

  return (
    <Map
      mapId="bf5047303312150"
      defaultZoom={13}
      defaultCenter={{ lat: 33.6844, lng: 73.0479 }}
      styles={DARK_MAP_STYLE}
      disableDefaultUI={true}
      gestureHandling="cooperative"
      style={{ width: '100%', height: '100%', borderRadius: '20px' }}
      onClick={handleInternalClick}
    >
      {pickup?.lat && (
        <AdvancedMarker position={pickup} title="Pickup Location">
          <Pin background="#F5A623" borderColor="#C47D0E" glyphColor="#0A0A0F" />
        </AdvancedMarker>
      )}

      {dropoff?.lat && (
        <AdvancedMarker position={dropoff} title="Drop-off Location">
          <Pin background="#FFFFFF" borderColor="#A09A90" glyphColor="#0A0A0F" />
        </AdvancedMarker>
      )}

      {driverLocation?.lat && (
        <AdvancedMarker position={driverLocation} title="Driver Location">
          <DriverMarker />
        </AdvancedMarker>
      )}

      {showRoute && pickup?.lat && dropoff?.lat && (
        <RoutePolyline origin={pickup} destination={dropoff} />
      )}
    </Map>
  );
}
