/**
 * @file src/components/maps/AddressAutocomplete.jsx
 * @description Google Maps Places Autocomplete input component.
 */

import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { useRef, useEffect, useState } from 'react';

export default function AddressAutocomplete({ placeholder, onSelect, value, className }) {
  const inputRef = useRef(null);
  const places = useMapsLibrary('places');

  useEffect(() => {
    if (!places || !inputRef.current) return;

    const ac = new places.Autocomplete(inputRef.current, {
      types: ['geocode', 'establishment'],
      fields: ['formatted_address', 'geometry', 'name'],
    });

    // Handle potential API errors or empty results
    const listener = ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (!place.geometry) return;

      const cityComp = place.address_components?.find(c =>
        c.types.includes('locality') || c.types.includes('administrative_area_level_2')
      );

      onSelect?.({
        formattedAddress: place.formatted_address,
        name: place.name,
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        city: cityComp?.long_name || '',
      });
    });

    return () => {
      window.google.maps.event.removeListener(listener);
    };
  }, [places]);

  useEffect(() => {
    if (inputRef.current && value !== undefined) {
      inputRef.current.value = value || '';
    }
  }, [value]);

  return (
    <input
      ref={inputRef}
      placeholder={placeholder}
      className={className || 'rf-input'}
      style={{ width: '100%' }}
    />
  );
}
