import type {
  Facility,
  ApiResponse,
  SamhsaFacility,
  FacilityService,
} from "../types/api";

// client/src/lib/api.ts
const API_BASE_URL = "http://localhost:3001/api";

function mapSamhsaFacilityToFacility(facility: SamhsaFacility): Facility {
  console.log("Mapping facility type:", facility);

  const excludedServices = ['4', '5', '6', '7', '8', '11', '16', '19', '21', '22', '24', '27', '29'];
  const mappedServices: FacilityService[] = Array.isArray(facility.services)

    ? facility.services
      .filter((service: any) => {
        const shouldInclude = !excludedServices.includes(service.f1);
        console.log(`Service f1: ${service.f1}, included: ${shouldInclude}`);
        return shouldInclude;
      }) // Exclude specific services

      .map((service: any) => {
        return {
          f1: service.f1 || "",
          f2: service.f2 || "",
          f3: service.f3 || "",
        };
      })
    : [];

  console.log("Mapped services result:", mappedServices);

  return {
    id: facility._irow.toString(),
    name: facility.name1 + (facility.name2 ? ` ${facility.name2}` : ""),
    latitude: parseFloat(facility.latitude),
    longitude: parseFloat(facility.longitude),
    address: `${facility.street1}${
      facility.street2 ? `, ${facility.street2}` : ""
    }, ${facility.city}, ${facility.state} ${facility.zip}`,
    phone: facility.phone || "N/A",
    hours: "Contact facility for hours",
    services: mappedServices,
    type: facility.typeFacility,
    // sType: facility.sType || "unknown sType",
    // sCodes: facility.sCodes || "unknown sCode"
  };
}

export const api = {
  async getFacilities(
    lat: number,
    lng: number,
    radius: number,
    pageSize: number,
    // page: number,
    // sType: string = "both",
    // sCodes: string[] = [],
  ) {
    try {
      // Create query string properly
      const queryString = new URLSearchParams({
        lat: lat.toString(),
        lng: lng.toString(),
        radius: radius.toString(),
        pageSize: pageSize.toString(),
        // page: page.toString(),
      }).toString();

      const response = await fetch(
        `${API_BASE_URL}/facilities?${queryString}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", 
        }
      );

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data: ApiResponse = await response.json();
      console.log("API Response data:", {
        page: data.page,
        totalPages: data.totalPages,
        recordCount: data.recordCount,
        facilitiesCount: data.rows?.length,
        sampleServices: data.rows?.[0]?.services, // Log sample services for debugging
      });

      if (!data.rows || !Array.isArray(data.rows)) {
        console.error("Unexpected API response format:", data);
        throw new Error("Invalid API response format");
      }


      return data.rows.map(mapSamhsaFacilityToFacility);
    } catch (error) {
      console.error("Error fetching facilities:", error);
      throw error;
    }
  },
};
