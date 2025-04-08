import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Box, BoxStatus } from '@shared/schema';
import { truckOptions, getOwnerColor, BoxPosition } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface TruckViewProps {
  boxes: Box[];
  onBoxUpdate: () => void;
}

const TruckView = ({ boxes, onBoxUpdate }: TruckViewProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTruck, setSelectedTruck] = useState(truckOptions[0]);
  
  // Get boxes that need to be loaded (packed or staging)
  const availableBoxes = boxes.filter(box => 
    box.status === BoxStatus.Packed || box.status === BoxStatus.Staging);
  
  // Get boxes already in the truck
  const loadedBoxes = boxes.filter(box => box.status === BoxStatus.Loaded);
  
  // Track drag operation
  const [draggedBox, setDraggedBox] = useState<Box | null>(null);
  
  // Update box position mutation
  const updateBoxPosition = useMutation({
    mutationFn: async ({ 
      boxId, 
      position,
      updateStatus = true 
    }: { 
      boxId: number, 
      position: BoxPosition,
      updateStatus?: boolean
    }) => {
      return apiRequest(
        'PATCH', 
        `/api/boxes/${boxId}/position`,
        { 
          position,
          // Only update status to Loaded if requested
          status: updateStatus ? BoxStatus.Loaded : undefined
        }
      );
    },
    onSuccess: () => {
      // Invalidate and refetch the boxes query
      queryClient.invalidateQueries({ queryKey: ['/api/boxes'] });
      onBoxUpdate();
    },
    onError: (error) => {
      console.error('Error updating box position:', error);
      toast({
        title: 'Error',
        description: 'Failed to update box position.',
        variant: 'destructive'
      });
    }
  });
  
  // Create the truck grid representation
  const renderTruckGrid = () => {
    const { length, width, height } = selectedTruck;
    const depthLabels = ['Front', 'Middle', 'Back'];
    const depthValues = ['front', 'middle', 'back'];
    const horizontalValues = ['left', 'center', 'right'];
    const verticalValues = ['high', 'mid', 'low'];
    
    // Only show as many depth columns as the truck length
    const visibleDepthLabels = depthLabels.slice(0, length);
    const visibleDepthValues = depthValues.slice(0, length);
    
    // Function to get human-readable position label
    const getPositionLabel = (depth: string, horizontal: string, vertical: string) => {
      let verticalLabel = '';
      
      // Convert technical terms to human-readable labels
      switch (vertical) {
        case 'high': verticalLabel = 'Top'; break;
        case 'mid': verticalLabel = 'Middle'; break;
        case 'low': verticalLabel = 'Bottom'; break;
      }
      
      // Capitalize horizontal and depth labels
      const horizontalLabel = horizontal.charAt(0).toUpperCase() + horizontal.slice(1);
      const depthLabel = depth.charAt(0).toUpperCase() + depth.slice(1);
      
      return `${verticalLabel} ${depthLabel} ${horizontalLabel}`;
    };
    
    return (
      <div className="bg-neutral-50 p-2">
        {/* Cab section at the top */}
        <div className="mb-4 bg-neutral-200 p-3 rounded-t-lg text-center border border-neutral-300">
          <p className="font-bold text-lg">Cab</p>
          <div className="mt-2 bg-neutral-100 p-2 rounded border border-neutral-300">
            <p className="font-medium">Overhead</p>
          </div>
        </div>
        
        {/* Truck body grid */}
        <div className="grid grid-cols-3 gap-2 border border-neutral-300 rounded-b-lg overflow-hidden mb-4">
          {/* Hard-coded cells for the truck sections matching the image */}
          {[
            // Front row (top row)
            { depth: 'front', horizontal: 'left', vertical: 'high' },
            { depth: 'front', horizontal: 'center', vertical: 'high' },
            { depth: 'front', horizontal: 'right', vertical: 'high' },
            
            // Middle row
            { depth: 'middle', horizontal: 'left', vertical: 'mid' },
            { depth: 'middle', horizontal: 'center', vertical: 'mid' },
            { depth: 'middle', horizontal: 'right', vertical: 'mid' },
            
            // Back row (bottom row)
            { depth: 'back', horizontal: 'left', vertical: 'low' },
            { depth: 'back', horizontal: 'center', vertical: 'low' },
            { depth: 'back', horizontal: 'right', vertical: 'low' }
          ].map((cellPosition, index) => {
            const { depth, horizontal, vertical } = cellPosition;
            
            // Find if there's a box at this position
            const boxAtPosition = loadedBoxes.find(box => 
              box.position?.depth === depth &&
              box.position?.horizontal === horizontal &&
              box.position?.vertical === vertical
            );
            
            // Get readable position for this cell
            const positionLabel = `${depth.charAt(0).toUpperCase() + depth.slice(1)}\n${horizontal.charAt(0).toUpperCase() + horizontal.slice(1)}`;
            
            return (
              <div
                key={`${depth}-${horizontal}-${vertical}`}
                className={`truck-cell border border-neutral-300 p-2 min-h-24 flex flex-col ${index < 3 ? 'bg-neutral-50' : (index < 6 ? 'bg-neutral-100' : 'bg-neutral-50')}`}
                onDragOver={(e) => {
                  e.preventDefault(); // Allow drop
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedBox) {
                    // Update box position
                    updateBoxPosition.mutate({
                      boxId: draggedBox.id,
                      position: {
                        depth: depth as "front" | "middle" | "back",
                        horizontal: horizontal as "left" | "center" | "right",
                        vertical: vertical as "high" | "mid" | "low"
                      }
                    });
                    setDraggedBox(null);
                  }
                }}
              >
                <div className="text-center font-medium text-sm mb-2">
                  {positionLabel}
                </div>
                
                {boxAtPosition && (
                  <div 
                    className="box-in-truck flex-1 flex items-center justify-center rounded"
                    style={{backgroundColor: getOwnerColor(boxAtPosition.owner)}}
                    draggable
                    onDragStart={(e) => {
                      setDraggedBox(boxAtPosition);
                    }}
                    title={getPositionLabel(depth, horizontal, vertical)}
                  >
                    <div className="text-center">
                      <div className="text-xs text-white font-medium">#{boxAtPosition.boxNumber}</div>
                      <div className="text-xs text-white mt-1">{boxAtPosition.owner}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Position key */}
        <div className="bg-white p-2 rounded border border-neutral-200 text-xs text-neutral-600">
          <p className="font-medium mb-1">Box Position Key</p>
          <p className="mb-2">Boxes are positioned using a three-part system:</p>
          <div className="grid grid-cols-1 gap-1">
            <div className="flex items-center">
              <span className="w-2 h-2 bg-neutral-400 rounded-full mr-1"></span>
              <span><b>Vertical:</b> Top, Middle, Bottom</span>
            </div>
            <div className="flex items-center">
              <span className="w-2 h-2 bg-neutral-400 rounded-full mr-1"></span>
              <span><b>Depth:</b> Front (near cab), Middle, Back (near door)</span>
            </div>
            <div className="flex items-center">
              <span className="w-2 h-2 bg-neutral-400 rounded-full mr-1"></span>
              <span><b>Horizontal:</b> Left, Center, Right</span>
            </div>
          </div>
          <p className="mt-2 italic">Example: "Top Front Right" means a box at the top level, in the front section, on the right side.</p>
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-4">
      <Card className="mb-4">
        <CardContent className="p-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Moving Truck</h3>
            <Select
              value={selectedTruck.name}
              onValueChange={(value) => {
                const truck = truckOptions.find(t => t.name === value);
                if (truck) setSelectedTruck(truck);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select truck size" />
              </SelectTrigger>
              <SelectContent>
                {truckOptions.map(truck => (
                  <SelectItem key={truck.name} value={truck.name}>
                    {truck.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Truck Visualization */}
          {renderTruckGrid()}
        </CardContent>
      </Card>
      
      {/* Available boxes for loading */}
      <Card>
        <CardContent className="p-3">
          <h3 className="font-medium mb-3">Available Boxes for Loading</h3>
          <div className="flex flex-wrap gap-2">
            {availableBoxes.map(box => (
              <div
                key={box.id}
                className="border border-neutral-300 bg-white p-2 rounded-md flex items-center"
                draggable
                onDragStart={(e) => {
                  setDraggedBox(box);
                }}
              >
                <div className="w-3 h-3 rounded-full mr-2" style={{backgroundColor: getOwnerColor(box.owner)}}></div>
                <span className="text-sm font-medium">Box #{box.boxNumber}</span>
              </div>
            ))}
            
            {availableBoxes.length === 0 && (
              <p className="text-sm text-neutral-500">No boxes available for loading</p>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-2">Drag boxes to the truck grid to assign positions</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TruckView;
