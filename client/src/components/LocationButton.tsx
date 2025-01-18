import * as React from "react"
import { Button } from "../components/ui/button";
import { MapPin } from 'lucide-react';

interface LocationButtonProps {
  onLocationEnabled: (location: { lat: number; lng: number }) => void;
  onError: (error: string) => void;
}

export function LocationButton({ onLocationEnabled, onError }: LocationButtonProps) {
  const requestLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          onLocationEnabled({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          let errorMessage = "Unable to get your location. ";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += "Please enable location services in your browser settings.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += "Location information is unavailable.";
              break;
            case error.TIMEOUT:
              errorMessage += "Location request timed out.";
              break;
            default:
              errorMessage += "An unknown error occurred.";
          }
          onError(errorMessage);
        }
      );
    } else {
      onError("Geolocation is not supported by your browser.");
    }
  };
  
  return (
    // <Button onClick={requestLocation} className="w-full" size="lg">
    <Button onClick={requestLocation} className="w-full">

      <MapPin />
      Enable Location Services
    </Button>
  );
}