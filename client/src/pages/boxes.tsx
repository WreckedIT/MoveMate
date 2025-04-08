import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Box, BoxStatus } from '@shared/schema';
import { defaultOwnerOptions, getOwnerColor } from '@/lib/utils';

import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import BoxCard from '@/components/box-card';
import BoxForm from '@/components/box-form';
import BatchQRPrint from '@/components/batch-qr-print';
import { Search, Printer, Plus, FileText } from 'lucide-react';

export default function Boxes() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>(BoxStatus.Packed);
  const [boxFormOpen, setBoxFormOpen] = useState(false);
  const [batchPrintOpen, setBatchPrintOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<string>('all');
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Fetch boxes
  const { 
    data: boxes = [], 
    isLoading,
    refetch: refetchBoxes
  } = useQuery<Box[]>({ 
    queryKey: ['/api/boxes'] 
  });
  
  // Get next box number for new boxes
  const nextBoxNumber = boxes.length > 0 
    ? Math.max(...boxes.map(box => box.boxNumber)) + 1 
    : 1;
  
  // Get unique room values from boxes
  const uniqueRooms = Array.from(new Set(boxes.map(box => box.room)));
  
  // Filter boxes based on active tab and filters
  const filteredBoxes = boxes.filter(box => {
    // Filter by status
    if (box.status !== activeTab) return false;
    
    // Filter by owner
    if (selectedOwner !== 'all' && box.owner.toLowerCase() !== selectedOwner) return false;
    
    // Filter by room
    if (selectedRoom !== 'all' && box.room !== selectedRoom) return false;
    
    // Filter by search term
    if (searchTerm) {
      const boxNumber = box.boxNumber.toString();
      const contents = box.contents.toLowerCase();
      const search = searchTerm.toLowerCase();
      
      return boxNumber.includes(search) || contents.includes(search);
    }
    
    return true;
  });
  
  // Handlers
  const handleBoxFormSuccess = () => {
    setBoxFormOpen(false);
    refetchBoxes();
  };

  const handleBatchPrintClick = () => {
    if (boxes.length === 0) {
      toast({
        title: "No boxes available",
        description: "Create some boxes first before printing QR codes.",
        variant: "destructive"
      });
      return;
    }
    setBatchPrintOpen(true);
  };
  
  // Box counts for tabs
  const boxCounts = {
    [BoxStatus.Packed]: boxes.filter(box => box.status === BoxStatus.Packed).length,
    [BoxStatus.Staging]: boxes.filter(box => box.status === BoxStatus.Staging).length,
    [BoxStatus.Loaded]: boxes.filter(box => box.status === BoxStatus.Loaded).length,
    [BoxStatus.Out]: boxes.filter(box => box.status === BoxStatus.Out).length,
    [BoxStatus.Delivered]: boxes.filter(box => box.status === BoxStatus.Delivered).length,
    [BoxStatus.Unpacked]: boxes.filter(box => box.status === BoxStatus.Unpacked).length,
  };
  
  return (
    <div className="pb-20 md:pb-0">
      {/* Tabs */}
      <Tabs defaultValue={BoxStatus.Packed} onValueChange={setActiveTab}>
        <div className="bg-white shadow-sm mb-4 overflow-x-auto">
          <TabsList className="flex w-full justify-start border-b border-neutral-200">
            <TabsTrigger 
              value={BoxStatus.Packed}
              className="pb-3 pt-3 px-4 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary"
            >
              Packed ({boxCounts[BoxStatus.Packed]})
            </TabsTrigger>
            <TabsTrigger 
              value={BoxStatus.Staging}
              className="pb-3 pt-3 px-4 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary"
            >
              Staging ({boxCounts[BoxStatus.Staging]})
            </TabsTrigger>
            <TabsTrigger 
              value={BoxStatus.Loaded}
              className="pb-3 pt-3 px-4 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary"
            >
              Loaded ({boxCounts[BoxStatus.Loaded]})
            </TabsTrigger>
            <TabsTrigger 
              value={BoxStatus.Out}
              className="pb-3 pt-3 px-4 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary"
            >
              Unloaded ({boxCounts[BoxStatus.Out]})
            </TabsTrigger>
            <TabsTrigger 
              value={BoxStatus.Delivered}
              className="pb-3 pt-3 px-4 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary"
            >
              Delivered ({boxCounts[BoxStatus.Delivered]})
            </TabsTrigger>
            <TabsTrigger 
              value={BoxStatus.Unpacked}
              className="pb-3 pt-3 px-4 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary"
            >
              Unpacked ({boxCounts[BoxStatus.Unpacked]})
            </TabsTrigger>
          </TabsList>
        </div>
        
        {/* Action Bar: Filter, search, and batch print */}
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-2">
            <div className="flex items-center bg-white border border-neutral-200 rounded-md w-full md:w-auto overflow-hidden">
              <div className="pl-3 text-neutral-400">
                <Search size={18} />
              </div>
              <Input
                placeholder="Search box number or contents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            
            <div className="flex space-x-2 w-full md:w-auto self-stretch">
              <Select
                value={selectedOwner}
                onValueChange={setSelectedOwner}
              >
                <SelectTrigger className="text-sm h-full w-full md:w-32">
                  <SelectValue placeholder="All Owners" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Owners</SelectItem>
                  {defaultOwnerOptions.map(owner => (
                    <SelectItem key={owner} value={owner.toLowerCase()}>{owner}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select
                value={selectedRoom}
                onValueChange={setSelectedRoom}
              >
                <SelectTrigger className="text-sm h-full w-full md:w-32">
                  <SelectValue placeholder="All Rooms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rooms</SelectItem>
                  {uniqueRooms.map(room => (
                    <SelectItem key={room} value={room}>{room}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Batch print button */}
          <div className="flex justify-end">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="h-9 px-3 gap-1"
                    onClick={handleBatchPrintClick}
                  >
                    <Printer className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">Print QR Codes</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Print multiple QR codes at once</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        {/* Box list */}
        <TabsContent value={BoxStatus.Packed} className="mt-0">
          <BoxesList
            boxes={filteredBoxes}
            isLoading={isLoading}
            status={BoxStatus.Packed}
          />
        </TabsContent>
        
        <TabsContent value={BoxStatus.Staging} className="mt-0">
          <BoxesList
            boxes={filteredBoxes}
            isLoading={isLoading}
            status={BoxStatus.Staging}
          />
        </TabsContent>
        
        <TabsContent value={BoxStatus.Loaded} className="mt-0">
          <BoxesList
            boxes={filteredBoxes}
            isLoading={isLoading}
            status={BoxStatus.Loaded}
          />
        </TabsContent>
        
        <TabsContent value={BoxStatus.Out} className="mt-0">
          <BoxesList
            boxes={filteredBoxes}
            isLoading={isLoading}
            status={BoxStatus.Out}
          />
        </TabsContent>
        
        <TabsContent value={BoxStatus.Delivered} className="mt-0">
          <BoxesList
            boxes={filteredBoxes}
            isLoading={isLoading}
            status={BoxStatus.Delivered}
          />
        </TabsContent>
        
        <TabsContent value={BoxStatus.Unpacked} className="mt-0">
          <BoxesList
            boxes={filteredBoxes}
            isLoading={isLoading}
            status={BoxStatus.Unpacked}
          />
        </TabsContent>
      </Tabs>
      
      {/* Add Box Modal */}
      <Dialog open={boxFormOpen} onOpenChange={setBoxFormOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Add New Box</DialogTitle>
          <BoxForm
            onSuccess={handleBoxFormSuccess}
            onCancel={() => setBoxFormOpen(false)}
            nextBoxNumber={nextBoxNumber}
          />
        </DialogContent>
      </Dialog>
      
      {/* Batch Print Modal */}
      <Dialog open={batchPrintOpen} onOpenChange={setBatchPrintOpen}>
        <DialogContent className="max-w-4xl">
          <BatchQRPrint 
            boxes={boxes}
            onClose={() => setBatchPrintOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
      {/* Floating Action Button */}
      <div className="fixed right-6 bottom-20 md:bottom-6">
        <Button
          onClick={() => setBoxFormOpen(true)}
          className="bg-secondary hover:bg-secondary-dark text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}

interface BoxesListProps {
  boxes: Box[];
  isLoading: boolean;
  status: BoxStatus;
}

const BoxesList = ({ boxes, isLoading, status }: BoxesListProps) => {
  const { toast } = useToast();
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array(3).fill(0).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse space-y-3">
                <div className="flex justify-between">
                  <div className="h-5 bg-neutral-200 rounded w-24"></div>
                  <div className="h-5 bg-neutral-200 rounded w-16"></div>
                </div>
                <div className="h-3 bg-neutral-200 rounded w-20"></div>
                <div className="h-3 bg-neutral-200 rounded w-full"></div>
                <div className="flex justify-between pt-1">
                  <div className="h-4 bg-neutral-200 rounded w-16"></div>
                  <div className="h-4 bg-neutral-200 rounded w-16"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  if (boxes.length === 0) {
    return (
      <div className="text-center p-8 bg-white rounded-lg shadow">
        <p className="text-neutral-500">No {status.toLowerCase()} boxes found</p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {boxes.map(box => (
        <BoxCard 
          key={box.id} 
          box={box} 
          onEdit={() => {
            toast({
              title: "Edit box",
              description: "Editing functionality will be implemented in the Box Details page"
            });
          }}
        />
      ))}
    </div>
  );
};
