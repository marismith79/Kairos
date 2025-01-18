import React, { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "../components/ui/input";
// import { EmergencyButton } from "../components/EmergencyButton";
import { Map } from "../components/Map";
import { FacilityCard } from "../components/FacilityCard";
import { LocationButton } from "../components/LocationButton";
import { useToast } from "../hooks/use-toast";
import { api } from "../lib/api";
import type { Facility } from "../types/api";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";

const DISPLAY_BATCH_SIZE = 20;
const RADIUS_IN_METERS = 100234;
const PAGE_SIZE = 20;

export default function Home() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [displayedCount, setDisplayedCount] = useState(DISPLAY_BATCH_SIZE);
  const [loading, setLoading] = useState(false);
  // const [originalFacilities, setOriginalFacilities] = useState<Facility[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]); // Facility types filter
  const [error, setError] = useState<string | null>(null);
  const [filtersExpanded, setFilters] = useState(false);
  const { toast } = useToast();

  const handleLocationEnabled = (newLocation: { lat: number; lng: number }) => {
    setLocation(newLocation);
    setError(null);
    toast({
      title: "Location Enabled",
      description: "Successfully obtained your location. Loading nearby facilities...",
    });
  };

  const handleLocationError = (errorMessage: string) => {
    setError(errorMessage);
    toast({
      variant: "destructive",
      title: "Location Error",
      description: errorMessage,
    });
  };

  const fetchFacilities = () => {
    if (location) {
      setLoading(true);
      api
        .getFacilities(location.lat, location.lng, RADIUS_IN_METERS, PAGE_SIZE)
        .then((data) => {
          console.log("Raw f.type values:", data.map((f) => f.type)); // Debugging
          setFacilities(data);
          setDisplayedCount(DISPLAY_BATCH_SIZE); // Reset display count on new fetch
          setError(null);
        })
        .catch(() => {
          setError("Failed to load facilities. Please try again later.");
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load facilities.",
          });
        })
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    if (location) fetchFacilities();
  }, [location]);

  // Filter logic
  const filteredFacilities = facilities.filter((facility) => {
    const matchesType =
      selectedTypes.length === 0 || selectedTypes.includes(facility.type);
    const matchesServices =
      selectedServices.length === 0 ||
      facility.services.some((service) => selectedServices.includes(service.f3));
    return matchesType && matchesServices;
  });

  const loadMore = () => {
    setDisplayedCount((prev) => Math.min(prev + DISPLAY_BATCH_SIZE, facilities.length, filteredFacilities.length));
  };

  const displayedFacilities = filteredFacilities.slice(0, displayedCount);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex gap-4 items-center">
        <Input className="flex-grow" placeholder="Tell us what you need..." type="text" />
        {/* <EmergencyButton /> */}
      </div>

      {!location && !error && (
        <div className="flex justify-center">
          <div className="max-w-md w-full">
            <LocationButton
              onLocationEnabled={handleLocationEnabled}
              onError={handleLocationError}
            />
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {location && (
        <div className="space-y-6">
          <div className="w-full rounded-lg overflow-hidden">
            <Map
              center={location}
              facilities={filteredFacilities}
              onRadiusChange={(radius) => console.log("Radius changed:", radius)}
              onCenterChange={(center) => console.log("Center changed:", center)}
            />
          </div>

          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <div
                className="flex justify-between items-center cursor-pointer"
                onClick={() => setFilters((prev) => !prev)}
              >
                <h3 className="font-medium">Filters</h3>
                <ChevronDown
                  className={`h-4 w-4 transform transition-transform ${
                    filtersExpanded ? "rotate-180" : ""
                  }`}
                />
              </div>

              {filtersExpanded && (
                <div className="mt-4 space-y-6">
                  {/* Facility Type Filters */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Facility Types</h4>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(
                        new Set(facilities.map((f) => f.type)) // Extract unique type values
                      ).map((typeValue) => (
                        <button
                          key={typeValue}
                          onClick={() =>
                            setSelectedTypes((prev) =>
                              prev.includes(typeValue)
                                ? prev.filter((t) => t !== typeValue)
                                : [...prev, typeValue]
                            )
                          }
                          className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                            selectedTypes.includes(typeValue)
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-accent"
                          }`}
                        >
                          {typeValue}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Service Filters */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Services</h4>
                    {Array.from(
                      new Set(
                        facilities.flatMap((f) => f.services.map((s) => s.f1))
                      )
                    )
                      .filter((f1Value: string) => {
                        console.log("Inspecting f1Value:", f1Value); // Debugging
                        return !['4', '5', '6', '7', '8', '11', '16', '19', '21', '22', '24', '27', '29'].includes(f1Value);
                      }) // Exclude specific filters
                      .map((f1Value: string) => {
                        const f3Values = Array.from(
                          new Set(
                            facilities
                              .flatMap((f) =>
                                f.services
                                  .filter((s) => s.f1 === f1Value)
                                  .map((s) => s.f3.split(";").map((v) => v.trim()))
                                  .flat()
                              )
                          )
                        );

                      return (
                        <div key={f1Value} className="space-y-2">
                          <h4 className="font-medium text-sm">{f1Value}</h4>
                          <div className="flex flex-wrap gap-2">
                            {f3Values.map((f3Value) => (
                              <button
                                key={f3Value}
                                onClick={() =>
                                  setSelectedServices((prev) =>
                                    prev.includes(f3Value)
                                      ? prev.filter((s) => s !== f3Value)
                                      : [...prev, f3Value]
                                  )
                                }
                                className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                                  selectedServices.includes(f3Value)
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-accent"
                                }`}
                              >
                                {f3Value}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <p className="text-black text-sm font-medium">
              Showing {displayedFacilities.length} of {filteredFacilities.length} nearby facilities...
            </p>

            {displayedFacilities.map((facility) => (
              <FacilityCard key={facility.id} facility={facility} />
            ))}

            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}

            {!loading && displayedFacilities.length < filteredFacilities.length && (
              <Button onClick={loadMore} variant="outline" className="w-full">
                Load More
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}