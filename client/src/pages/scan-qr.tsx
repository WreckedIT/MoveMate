import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Box } from '@shared/schema';
import QRScanner from '@/components/qr-scanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function ScanQR() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [scanning, setScanning] = useState(false);
  const [scannedBoxId, setScannedBoxId] = useState<number | null>(null);
  
  // Query for scanned box details
  const { 
    data: box,
    isLoading,
    error
  } = useQuery<Box | null>({
    queryKey: ['/api/boxes', scannedBoxId],
    enabled: scannedBoxId !== null,
  });
  
  // Handle QR scan result
  const handleScan = (boxId: number) => {
    setScanning(false);
    setScannedBoxId(boxId);
  };
  
  // Create a mutation to update box status
  const updateBoxStatus = useMutation({
    mutationFn: (payload: { boxId: number, status: string }) => {
      return apiRequest('PATCH', `/api/boxes/${payload.boxId}/status`, { status: payload.status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/boxes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      toast({
        title: 'Status updated',
        description: 'Box status has been updated successfully.'
      });
      
      // Refetch the box data
      if (scannedBoxId) {
        queryClient.invalidateQueries({ queryKey: ['/api/boxes', scannedBoxId] });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update box status.',
        variant: 'destructive'
      });
    }
  });
  
  // Determine available actions based on current box status
  const getAvailableActions = () => {
    if (!box) return [];
    
    switch(box.status) {
      case 'packed':
        return [
          { label: 'Mark as Staging', value: 'staging' },
          { label: 'Load to Truck', value: 'loaded' }
        ];
      case 'staging':
        return [
          { label: 'Load to Truck', value: 'loaded' }
        ];
      case 'loaded':
        return [
          { label: 'Unload from Truck', value: 'out' }
        ];
      case 'out':
        return [
          { label: 'Mark as Delivered', value: 'delivered' },
          { label: 'Load back to Truck', value: 'loaded' }
        ];
      case 'delivered':
        return [
          { label: 'Mark as Unpacked', value: 'unpacked' }
        ];
      default:
        return [];
    }
  };
  
  // Handle status update
  const handleStatusUpdate = (status: string) => {
    if (!box) return;
    
    updateBoxStatus.mutate({
      boxId: box.id,
      status
    });
  };
  
  // Handle view box details
  const handleViewDetails = () => {
    if (!box) return;
    navigate(`/boxes/${box.id}`);
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      {scanning ? (
        <QRScanner 
          onScan={handleScan}
          onClose={() => setScanning(false)}
        />
      ) : (
        <div className="w-full max-w-md">
          {scannedBoxId && isLoading ? (
            <Card className="mb-6">
              <CardContent className="p-6 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </CardContent>
            </Card>
          ) : box ? (
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="text-center mb-4">
                  <div className={`inline-block px-3 py-1 rounded-full ${
                    box.owner.toLowerCase() === 'john' ? 'bg-primary text-white' : 
                    box.owner.toLowerCase() === 'lisa' ? 'bg-secondary text-white' :
                    box.owner.toLowerCase() === 'kids' ? 'bg-accent text-white' :
                    'bg-neutral-400 text-white'
                  } mb-2`}>
                    {box.owner}'s Box
                  </div>
                  <h2 className="text-xl font-bold">Box #{box.boxNumber}</h2>
                  <p className="text-neutral-600">{box.room}</p>
                  <p className="text-neutral-500 mt-2">{box.contents}</p>
                  
                  <div className="mt-4 py-2 px-3 bg-neutral-100 rounded-md inline-block">
                    <span className="font-medium">Status: </span>
                    <span className="capitalize">{box.status}</span>
                  </div>
                  
                  {box.position && (
                    <div className="mt-2">
                      <span className="text-sm text-neutral-500">
                        Position: {box.position.depth}-{box.position.horizontal}-{box.position.vertical}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Box actions */}
                <div className="space-y-2 mt-6">
                  {getAvailableActions().map((action, index) => (
                    <Button
                      key={index}
                      onClick={() => handleStatusUpdate(action.value)}
                      className="w-full bg-primary"
                      disabled={updateBoxStatus.isPending}
                    >
                      {action.label}
                    </Button>
                  ))}
                  
                  <Button
                    onClick={handleViewDetails}
                    variant="outline"
                    className="w-full mt-2"
                  >
                    View Box Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : scannedBoxId && error ? (
            <Card className="mb-6">
              <CardContent className="p-6 text-center">
                <div className="text-red-500 mb-2">Error loading box details</div>
                <p className="text-neutral-600">
                  The QR code was scanned but we couldn't find the box.
                </p>
                <Button onClick={() => setScanning(true)} className="mt-4">
                  Scan Again
                </Button>
              </CardContent>
            </Card>
          ) : null}
          
          <Card>
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-medium mb-4">Scan Box QR Code</h2>
              <p className="text-neutral-600 mb-6">
                Scan the QR code on a box to view its details and update its status.
              </p>
              <Button 
                onClick={() => setScanning(true)}
                className="bg-primary"
                size="lg"
              >
                <span className="material-icons mr-2">qr_code_scanner</span>
                Start Scanning
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
