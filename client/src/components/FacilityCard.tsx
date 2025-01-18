import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ChevronDown, ChevronUp, Phone, Clock, MapPin } from 'lucide-react';
import type { Facility } from '../types/api';
import typeColors from "../components/ui/factypeColors";

interface FacilityCardProps {
  facility: Facility;
  // showSaveButton?: boolean;
}

export function FacilityCard({ facility }: FacilityCardProps) {
// export function FacilityCard({ facility, showSaveButton = true }: FacilityCardProps) {
  const [expanded, setExpanded] = useState(false);
  const facilityColor = typeColors[facility.type] || "#ffffff";
  // const { toast } = useToast();  //will be helpful when displaying things like "you can view saved facilities in your profile"

  // const { data: savedFacilities } = useQuery<SelectSavedFacility[]>({
  //   queryKey: ["/api/saved-facilities"],
  //   enabled: !!user,
  // });

  // const saveMutation = useMutation({
  //   mutationFn: async () => {
  //     const res = await fetch("/api/saved-facilities", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         facilityId: facility.id,
  //         facilityData: facility,
  //       }),
  //       credentials: "include",
  //     });

  //     if (!res.ok) throw new Error("Failed to save facility");
  //     return res.json();
  //   },
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ["/api/saved-facilities"] });
  //     toast({
  //       title: "Facility saved!",
  //       description: "You can view it in your profile.",
  //     });
  //   },
  //   onError: () => {
  //     toast({
  //       variant: "destructive",
  //       title: "Error",
  //       description: "Failed to save facility. Please try again.",
  //     });
  //   },
  // });

  // const removeMutation = useMutation({
  //   mutationFn: async () => {
  //     const saved = savedFacilities?.find(
  //       (s) => s.facilityId === facility.id
  //     );
  //     if (!saved) throw new Error("Facility not found");

  //     const res = await fetch(`/api/saved-facilities/${saved.id}`, {
  //       method: "DELETE",
  //       credentials: "include",
  //     });

  //     if (!res.ok) throw new Error("Failed to remove facility");
  //     return res.json();
  //   },
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ["/api/saved-facilities"] });
  //     toast({
  //       title: "Facility removed",
  //       description: "Successfully removed from saved facilities.",
  //     });
  //   },
  //   onError: () => {
  //     toast({
  //       variant: "destructive",
  //       title: "Error",
  //       description: "Failed to remove facility. Please try again.",
  //     });
  //   },
  // });


  return (
    <Card 
      className="w-full"
      style={{
        borderLeft: `8px solid ${facilityColor}`, // Color-coded border
        backgroundColor: `#ffffff`,
      }}
    >
      <CardHeader className="flex flex-row items-center justify-between">
  <div>
    <h3 className="text-lg font-semibold">{facility.name}</h3>
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <MapPin className="h-4 w-4" />
      <span>
        <a
          href={`https://www.google.com/maps?q=${facility.latitude},${facility.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          {facility.address}
        </a>
      </span>
    </div>
  </div>
  <div className="flex gap-2">
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setExpanded(!expanded)}
    >
      {expanded ? (
        <ChevronUp className="h-4 w-4" />
      ) : (
        <ChevronDown className="h-4 w-4" />
      )}
    </Button>
  </div>
</CardHeader>

<CardContent>
  <div className="flex items-center gap-2 mb-2">
    <Phone className="h-4 w-4" />
    <span>{facility.phone}</span>
  </div>
  <div className="flex items-center gap-2 mb-4">
    <Clock className="h-4 w-4" />
    <span>{facility.hours}</span>
  </div>

  {expanded && (
    <div className="space-y-4">
      <h4 className="font-medium">More Details:</h4>
      <div className="space-y-3">
        {facility.services && facility.services.length > 0 ? (
          facility.services.map((service, index) => (
            <div key={index} className="space-y-1">
              <h5 className="text-sm font-medium">{service.f1}</h5>
              <p className="text-sm text-muted-foreground pl-4">{service.f3}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No services information available</p>
        )}
      </div>
    </div>
  )}
</CardContent>

    </Card>
  );
}