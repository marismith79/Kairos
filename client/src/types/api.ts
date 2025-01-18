export interface FacilityService {
  f1: string; // Service category
  f2: string; // Service code
  f3: string; // Service description
}

export interface Facility {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  phone: string;
  hours: string;
  services: FacilityService[];
  type: string;
  // sType: string;
  // sCodes : string;
}

export interface SamhsaFacility {
  _irow: number;
  name1: string;
  name2: string | null;
  street1: string;
  street2: string | null;
  city: string;
  state: string;
  zip: string;
  phone: string;
  intake1: string | null;
  hotline1: string | null;
  website: string | null;
  latitude: string;
  longitude: string;
  miles: number;
  services: FacilityService[];
  typeFacility: string;
  // sType: string;
  // sCodes : string;
}

export interface ApiResponse {
  page: number;
  totalPages: number;
  recordCount: number;
  rows: SamhsaFacility[];
}