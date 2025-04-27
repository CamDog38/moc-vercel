// Default service types with proper display names
export const DEFAULT_SERVICE_TYPES = {
  REGISTRATION_OFFICE: "Registration at our offices",
  REGISTRATION_HOME: "Registration at your home",
  SMALL_CEREMONY: "Small ceremony",
  WEDDING_CEREMONY: "Wedding ceremony",
} as const;

// This will be populated from the API
export interface ServiceTypeMapping {
  [key: string]: string;
}

// Function to fetch service types from the API
export async function fetchServiceTypes(): Promise<ServiceTypeMapping> {
  try {
    const response = await fetch('/api/service-types');
    if (!response.ok) {
      throw new Error('Failed to fetch service types');
    }
    
    const data = await response.json();
    
    // Map the raw service types to include display names
    const serviceTypes: ServiceTypeMapping = {};
    
    data.forEach((type: any) => {
      // If the type has a displayName property, use it
      if (type.displayName) {
        serviceTypes[type.serviceType] = type.displayName;
      } 
      // Otherwise, use the default display name if available
      else if (DEFAULT_SERVICE_TYPES[type.serviceType as keyof typeof DEFAULT_SERVICE_TYPES]) {
        serviceTypes[type.serviceType] = DEFAULT_SERVICE_TYPES[type.serviceType as keyof typeof DEFAULT_SERVICE_TYPES];
      }
      // If no default display name, convert from code format to readable format
      else {
        const displayName = type.serviceType
          .replace(/_/g, ' ')
          .replace(/([A-Z])/g, ' $1')
          .trim()
          .toLowerCase()
          .replace(/\b\w/g, (c: string) => c.toUpperCase());
          
        serviceTypes[type.serviceType] = displayName;
      }
    });
    
    // Merge with default service types to ensure we always have some values
    return { ...DEFAULT_SERVICE_TYPES, ...serviceTypes };
  } catch (error) {
    console.error('Error fetching service types:', error);
    // Return default service types as fallback
    return { ...DEFAULT_SERVICE_TYPES };
  }
}