import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { QrCode } from "@shared/schema";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Box status enumeration
export enum BoxStatus {
  Packed = "packed",
  Staging = "staging",
  Loaded = "loaded",
  Out = "out",
  Delivered = "delivered",
  Unpacked = "unpacked"
}

// Box position in truck
export interface BoxPosition {
  depth: "front" | "middle" | "back";
  horizontal: "left" | "center" | "right";
  vertical: "low" | "mid" | "high";
}

// Default owner options - empty array since users create their own
export const defaultOwnerOptions: string[] = [];

// Owner types
export interface Owner {
  id: number;
  name: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

// Cache for owners from API
let ownersCache: Owner[] = [];

// Function to fetch and cache owners
export const fetchOwners = async (): Promise<Owner[]> => {
  try {
    const response = await fetch('/api/owners');
    if (!response.ok) {
      throw new Error('Failed to fetch owners');
    }
    const owners = await response.json();
    ownersCache = owners;
    return owners;
  } catch (error) {
    console.error('Error fetching owners:', error);
    return ownersCache;
  }
};

// Default color map - empty since users create their own owners
const defaultOwnerColorMap: Record<string, string> = {};

// Owner color mapping that checks cache first, then falls back to defaults
export const getOwnerColor = (owner: string): string => {
  // First check if we have owners in the cache
  if (ownersCache.length > 0) {
    // Find the owner by name (case-insensitive)
    const foundOwner = ownersCache.find(
      o => o.name.toLowerCase() === owner.toLowerCase()
    );
    
    if (foundOwner) {
      return foundOwner.color;
    }
  }
  
  // Fall back to default mapping for backwards compatibility
  const ownerLower = owner.toLowerCase();
  return defaultOwnerColorMap[ownerLower] || "#94A3B8"; // Default gray
};

// For backwards compatibility during transition - empty except default
export const ownerColors: Record<string, string> = {
  "default": "bg-neutral-500"
};

// Room options
export const roomOptions = [
  "Kitchen",
  "Living Room",
  "Dining Room",
  "Bedroom",
  "Bathroom",
  "Office",
  "Garage",
  "Kids Room",
  "Storage",
  "Other"
];

// Truck dimensions
export interface TruckDimensions {
  name: string;
  width: number;
  height: number;
  length: number;
}

// Truck options
export const truckOptions: TruckDimensions[] = [
  { name: "10ft Truck", width: 3, height: 3, length: 3 },
  { name: "15ft Truck", width: 3, height: 3, length: 4 },
  { name: "20ft Truck", width: 3, height: 3, length: 5 },
  { name: "26ft Truck", width: 3, height: 3, length: 6 }
];

// Status display text and classes
export const getStatusDisplay = (status: BoxStatus) => {
  const statusMap = {
    [BoxStatus.Packed]: { text: "Packed", className: "status-packed" },
    [BoxStatus.Staging]: { text: "Staging", className: "status-staging" },
    [BoxStatus.Loaded]: { text: "Loaded", className: "status-loaded" },
    [BoxStatus.Out]: { text: "Unloaded", className: "status-out" },
    [BoxStatus.Delivered]: { text: "Delivered", className: "status-delivered" },
    [BoxStatus.Unpacked]: { text: "Unpacked", className: "status-unpacked" }
  };
  
  return statusMap[status] || { text: status, className: "" };
};

// Format position string
export const formatPosition = (position: BoxPosition | null): string => {
  if (!position) return "-";
  
  // Convert technical terms to human-readable labels
  let verticalLabel = '';
  switch (position.vertical) {
    case 'high': verticalLabel = 'Top'; break;
    case 'mid': verticalLabel = 'Middle'; break;
    case 'low': verticalLabel = 'Bottom'; break;
    default: verticalLabel = position.vertical;
  }
  
  // Capitalize horizontal and depth labels
  const horizontalLabel = position.horizontal.charAt(0).toUpperCase() + position.horizontal.slice(1);
  const depthLabel = position.depth.charAt(0).toUpperCase() + position.depth.slice(1);
  
  return `${verticalLabel} ${depthLabel} ${horizontalLabel}`;
};

// Generate QR code data
export const generateQrCodeData = (boxId: number): string => {
  return `boxtracker-${boxId}`;
};

// Parse QR code data
export const parseQrCodeData = (data: string): number | null => {
  const match = data.match(/boxtracker-(\d+)/);
  return match ? parseInt(match[1], 10) : null;
};

// Download data as CSV
export const downloadCsv = (data: any[], filename: string) => {
  // Get column headers (assuming all objects have the same keys)
  const headers = Object.keys(data[0] || {});
  
  // Create CSV rows
  const csvRows = [
    headers.join(","), // Header row
    ...data.map(row => 
      headers.map(header => {
        // Handle values that need quotes (contains commas, newlines, or quotes)
        const value = row[header] == null ? '' : row[header].toString();
        if (value.includes(',') || value.includes('\n') || value.includes('"')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ];
  
  // Create a Blob and download
  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
