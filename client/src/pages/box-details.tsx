import { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Box } from '@shared/schema';
import { getStatusDisplay, formatPosition, ownerColors } from '@/lib/utils';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import QRCodeDisplay from '@/components/qr-code';
import BoxForm from '@/components/box-form';
import { ArrowLeft, Edit, QrCode, Trash } from 'lucide-react';

export default function BoxDetails() {
  const [_, navigate] = useLocation();
  const [match, params] = useRoute('/boxes/:id');
  const boxId = params?.id ? parseInt(params.id, 10) : null;
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Fetch box details
  const { 
    data: box,
    isLoading,
    isError,
    error
  } = useQuery<Box>({
    queryKey: ['/api/boxes', boxId],
    enabled: !!boxId,
  });
  
  // Delete box mutation
  const deleteBox = useMutation({
    mutationFn: () => {
      return apiRequest('DELETE', `/api/boxes/${boxId}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/boxes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      
      toast({
        title: 'Box deleted',
        description: `Box #${box?.boxNumber} has been deleted.`
      });
      
      // Redirect to boxes page
      navigate('/boxes');
    },
    onError: (error) => {
      console.error('Error deleting box:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete box.',
        variant: 'destructive'
      });
    }
  });
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (isError || !box) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error Loading Box</CardTitle>
            <CardDescription>
              We couldn't find the box you're looking for.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              onClick={() => navigate('/boxes')}
              className="w-full"
            >
              Go Back to All Boxes
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Determine owner color
  
  const ownerColor = box.owner ? ownerColors[box.owner.toLowerCase() as keyof typeof ownerColors] || '' : '';
  
  // Get status display
  const { text: statusText, className: statusClass } = getStatusDisplay(box.status);
  
  // Handle edit success
  const handleEditSuccess = () => {
    setEditDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['/api/boxes', boxId] });
    toast({
      title: 'Box updated',
      description: `Box #${box.boxNumber} has been updated.`
    });
  };
  
  // Handle delete
  const handleDelete = () => {
    deleteBox.mutate();
  };
  
  return (
    <div className="max-w-2xl mx-auto pb-20 md:pb-0">
      <div className="mb-4">
        <Button 
          variant="ghost" 
          className="pl-0"
          onClick={() => navigate('/boxes')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Boxes
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-3 h-3 rounded-full ${ownerColor}`}></div>
                <CardTitle>Box #{box.boxNumber}</CardTitle>
              </div>
              <CardDescription>
                Created for {box.room}
              </CardDescription>
            </div>
            <Badge className={statusClass.replace('text-xs py-1 px-2 rounded-full', '')}>
              {statusText}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-neutral-500 mb-1">Contents</h3>
            <p className="text-neutral-700">{box.contents || "No contents listed"}</p>
          </div>
          
          {box.position && (
            <div>
              <h3 className="text-sm font-medium text-neutral-500 mb-1">Position in Truck</h3>
              <div className="bg-neutral-100 py-1 px-3 rounded inline-block font-medium">
                {formatPosition(box.position)}
              </div>
            </div>
          )}
          
          <Separator />
          
          <div className="pt-2">
            <h3 className="text-sm font-medium text-neutral-500 mb-2">Box Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-neutral-500">Owner</p>
                <p className="font-medium">{box.owner}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Room</p>
                <p className="font-medium">{box.room}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Box Number</p>
                <p className="font-medium">#{box.boxNumber}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Status</p>
                <p className="font-medium capitalize">{box.status}</p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t p-4">
          <Button
            variant="outline"
            onClick={() => setQrDialogOpen(true)}
          >
            <QrCode className="mr-2 h-4 w-4" /> View QR Code
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(true)}
            >
              <Edit className="mr-2 h-4 w-4" /> Edit Box
            </Button>
            
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash className="mr-2 h-4 w-4" /> Delete
            </Button>
          </div>
        </CardFooter>
      </Card>
      
      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Box #{box.boxNumber} QR Code</DialogTitle>
          <QRCodeDisplay box={box} ownerColor={ownerColor} />
        </DialogContent>
      </Dialog>
      
      {/* Edit Box Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Edit Box #{box.boxNumber}</DialogTitle>
          <BoxForm
            existingBox={box}
            onSuccess={handleEditSuccess}
            onCancel={() => setEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Box #{box.boxNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This box and all associated data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
