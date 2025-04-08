import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box } from '@shared/schema';
import TruckView from '@/components/truck-view';

export default function TruckLoading() {
  // Fetch boxes
  const { 
    data: boxes = [], 
    isLoading,
    refetch: refetchBoxes
  } = useQuery<Box[]>({ 
    queryKey: ['/api/boxes'] 
  });
  
  return (
    <div className="pb-20 md:pb-0">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Truck Loading Plan</h1>
        <p className="text-neutral-500 mt-1">
          Drag boxes to their position in the truck
        </p>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <TruckView 
          boxes={boxes} 
          onBoxUpdate={refetchBoxes}
        />
      )}
    </div>
  );
}
