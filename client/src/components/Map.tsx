import React, { useEffect, useRef } from 'react';
import type { Facility } from '../types/api';
import type { Map as LeafletMap } from 'leaflet';
import "react-toastify/dist/ReactToastify.css"; 
import typeColors from "../components/ui/factypeColors";


declare global {
  interface Window {
    L: typeof import('leaflet');
  }
}

interface MapProps {
  center: { lat: number; lng: number } | null;
  facilities: Facility[];
  onRadiusChange: (radius: number) => void;
  onCenterChange: (center: { lat: number; lng: number }) => void;
}

export function Map({ center, facilities, onRadiusChange, onCenterChange }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const userMarkerRef = useRef<any>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!mapRef.current || !center) return;

    console.log('Initializing map with center:', center);

    // Add Leaflet CSS first
    const leafletCss = document.createElement('link');
    leafletCss.rel = 'stylesheet';
    leafletCss.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(leafletCss);

    // Create and load Leaflet script
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;

    let hasError = false;

    script.onerror = () => {
      console.error('Failed to load Leaflet script');
      hasError = true;
    };

    script.onload = () => {
      if (!mapRef.current || hasError) return;

      console.log('Leaflet script loaded, initializing map');
      
      try {
        // Initialize the map
        const map = new window.L.Map(mapRef.current, {
          center: [center.lat, center.lng],
          zoom: 13,
          scrollWheelZoom: true,
          zoomControl: true
        });

        console.log('Map instance created');

        // Add the tile layer with API key
        const stadia_apiKey = (window as any).__VITE_STADIA_API_KEY__;
        window.L.tileLayer(`https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}@2x.png?api_key=${stadia_apiKey}`, {
            maxZoom: 20,
          attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>'
        }).addTo(map);

        console.log('Tile layer added');
        
        if (userMarkerRef.current) {
            map.removeLayer(userMarkerRef.current); // Remove the existing user marker if it exists
          }
  
          userMarkerRef.current = window.L.circleMarker([center.lat, center.lng], {
            radius: 6, // Size of the marker
            fillColor: "#62b7e4", // Red for user's location
            color: "#000000", // White border
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8,
          }).addTo(map);
  
          console.log("User location marker added");

        // Add markers for facilities
        facilities.forEach((facility) => {
            const facilityColor = typeColors[facility.type] || "gray"; 

            const marker = window.L.circleMarker([facility.latitude, facility.longitude], {
              radius: 8,
              fillColor: facilityColor,
              color: "#fff",
              weight: 2,
              opacity: 1,
              fillOpacity: 0.8,
            }).addTo(map);


          // Create a custom popup with facility info and a button
          const popupContent = document.createElement('div');
          popupContent.className = 'flex flex-col gap-2 p-2';

          const title = document.createElement('h3');
          title.className = 'font-semibold text-lg';
          title.textContent = facility.name;

          const button = document.createElement('button');
          button.className = 'px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors';
          button.textContent = 'View Details';
          button.onclick = () => {
            const element = document.getElementById(`facility-${facility.id}`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth' });
              marker.closePopup();
            }
          };

          popupContent.appendChild(title);
          popupContent.appendChild(button);

          marker.bindPopup(popupContent);

          // Add click handler to marker
          marker.on('click', () => {
            marker.openPopup();
          });
        });

        console.log('Markers added');

        // Add zoom event listener

        map.on("zoomend moveend", () => {
            const zoom = map.getZoom();
            const currentCenter = map.getCenter();
            const radius = calculateRadiusFromZoom(zoom);
          
            // Debounce radius and center changes
            if (debounceTimeoutRef.current) {
              clearTimeout(debounceTimeoutRef.current);
            }
          
            debounceTimeoutRef.current = setTimeout(() => {
              onRadiusChange(radius);
              onCenterChange({ lat: currentCenter.lat, lng: currentCenter.lng });
            }, 500); // Adjust debounce delay as needed
          });

        mapInstanceRef.current = map;
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    document.head.appendChild(script);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
      const leafletCss = document.querySelector('link[href*="leaflet.css"]');
      if (leafletCss) {
        document.head.removeChild(leafletCss);
      }
      document.head.removeChild(script);
    };
  }, [center, facilities, onRadiusChange, onCenterChange]);

  return (
    <div className="w-full h-[400px] bg-muted rounded-lg overflow-hidden">
      {!center ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      ) : (
        <div ref={mapRef} className="w-full h-full" />
      )}
    </div>
  );
}

// Helper function to calculate radius based on zoom level
function calculateRadiusFromZoom(zoom: number): number {
    const zoomLevelToRadius: Record<number, number> = {
      20: 50, // Example values in meters
      19: 100,
      18: 200,
      17: 400,
      16: 800,
      15: 1600,
      14: 3200,
      13: 6400,
      12: 12800,
      11: 25600,
      10: 51200,
      9: 102400,
      8: 204800,
    };
  
    return zoomLevelToRadius[zoom] ?? 40234; // Default radius
  }