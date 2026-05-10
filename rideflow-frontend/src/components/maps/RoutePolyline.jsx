/**
 * @file src/components/maps/RoutePolyline.jsx
 */

import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { useEffect, useState } from 'react';

export default function RoutePolyline({ origin, destination }) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const [directionsRenderer, setDirectionsRenderer] = useState(null);

  useEffect(() => {
    if (!map || !routesLib) return;
    const renderer = new routesLib.DirectionsRenderer({
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: '#F5A623',
        strokeWeight: 5,
        strokeOpacity: 0.8,
      },
    });
    renderer.setMap(map);
    setDirectionsRenderer(renderer);
    return () => renderer.setMap(null);
  }, [map, routesLib]);

  useEffect(() => {
    if (!directionsRenderer || !routesLib || !origin?.lat || !destination?.lat) return;
    const service = new routesLib.DirectionsService();
    service.route(
      {
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        travelMode: 'DRIVING',
      },
      (result, status) => {
        if (status === 'OK') directionsRenderer.setDirections(result);
      }
    );
  }, [directionsRenderer, routesLib, origin, destination]);

  return null;
}
