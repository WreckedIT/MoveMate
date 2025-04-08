import { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { generateQrCodeData, getOwnerColor } from '@/lib/utils';
import { Box, BoxStatus } from '@shared/schema';
import { Printer, LayoutGrid, Settings } from 'lucide-react';

interface BatchQRPrintProps {
  boxes: Box[];
  onClose: () => void;
}

// Print layout types
type PrintLayout = 'grid-2' | 'grid-4' | 'grid-6' | 'labels';

// Box filter options
type BoxFilter = 'all' | BoxStatus | 'selected';

const BatchQRPrint = ({ boxes, onClose }: BatchQRPrintProps) => {
  const [selectedLayout, setSelectedLayout] = useState<PrintLayout>('grid-4');
  const [selectedBoxes, setSelectedBoxes] = useState<Set<number>>(new Set());
  const [filterBy, setFilterBy] = useState<BoxFilter>('all');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [qrCodesGenerated, setQrCodesGenerated] = useState<Record<number, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate QR codes when boxes change
  useEffect(() => {
    const generateQRCodes = async () => {
      if (boxes.length === 0) return;
      
      setIsGenerating(true);
      const newQrCodes: Record<number, string> = {};
      
      // Process boxes in batches to avoid blocking the UI
      const batchSize = 10;
      for (let i = 0; i < boxes.length; i += batchSize) {
        const batch = boxes.slice(i, i + batchSize);
        
        // Generate QR codes for each box in the batch
        await Promise.all(batch.map(async (box) => {
          try {
            const qrData = generateQrCodeData(box.id);
            const qrDataUrl = await QRCode.toDataURL(qrData, {
              width: 200,
              margin: 1,
              color: {
                dark: '#000',
                light: '#FFF',
              },
            });
            newQrCodes[box.id] = qrDataUrl;
          } catch (error) {
            console.error(`Error generating QR code for box #${box.boxNumber}:`, error);
          }
        }));
        
        // Short delay to allow UI updates
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      setQrCodesGenerated(newQrCodes);
      setIsGenerating(false);
    };
    
    generateQRCodes();
  }, [boxes]);

  const toggleBoxSelection = (boxId: number) => {
    const newSelected = new Set(selectedBoxes);
    if (newSelected.has(boxId)) {
      newSelected.delete(boxId);
    } else {
      newSelected.add(boxId);
    }
    setSelectedBoxes(newSelected);
  };

  const selectAllBoxes = () => {
    const filteredBoxes = getFilteredBoxes();
    const newSelected = new Set(filteredBoxes.map(box => box.id));
    setSelectedBoxes(newSelected);
  };

  const clearSelection = () => {
    setSelectedBoxes(new Set());
  };

  const getFilteredBoxes = (): Box[] => {
    if (filterBy === 'all') {
      return boxes;
    } else if (filterBy === 'selected') {
      return boxes.filter(box => selectedBoxes.has(box.id));
    } else {
      return boxes.filter(box => box.status === filterBy);
    }
  };

  const getBoxesForPrinting = (): Box[] => {
    const filteredBoxes = getFilteredBoxes();
    
    // If using "selected" filter or if some boxes are selected, return only selected boxes
    if (filterBy === 'selected' || (selectedBoxes.size > 0 && selectedBoxes.size < boxes.length)) {
      return filteredBoxes.filter(box => selectedBoxes.has(box.id));
    }
    
    return filteredBoxes;
  };

  const handlePrint = () => {
    const boxesToPrint = getBoxesForPrinting();
    if (boxesToPrint.length === 0) {
      alert('Please select at least one box to print');
      return;
    }
    
    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) {
      alert('Please allow pop-ups to print QR codes');
      return;
    }
    
    // CSS for different layout options
    const layoutStyles = {
      'grid-2': {
        gridCols: 'grid-template-columns: repeat(2, 1fr);',
        width: '45%',
        fontSize: 'font-size: 14px;',
        qrSize: '180px',
      },
      'grid-4': {
        gridCols: 'grid-template-columns: repeat(2, 1fr);',
        width: '45%',
        fontSize: 'font-size: 12px;',
        qrSize: '150px',
      },
      'grid-6': {
        gridCols: 'grid-template-columns: repeat(3, 1fr);',
        width: '30%',
        fontSize: 'font-size: 11px;',
        qrSize: '120px',
      },
      'labels': {
        gridCols: 'grid-template-columns: repeat(3, 1fr);',
        width: '30%',
        fontSize: 'font-size: 10px;',
        qrSize: '100px',
      }
    };
    
    const layoutConfig = layoutStyles[selectedLayout];
    
    let html = `
      <html>
        <head>
          <title>Print Box QR Codes</title>
          <style>
            @media print {
              @page {
                size: letter;
                margin: 0.5cm;
              }
              body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              margin: 0;
              padding: 20px;
            }
            .print-header {
              text-align: center;
              margin-bottom: 20px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .print-title {
              font-size: 20px;
              font-weight: bold;
            }
            .print-info {
              font-size: 12px;
              color: #666;
            }
            .qr-grid {
              display: grid;
              ${layoutConfig.gridCols}
              gap: ${selectedLayout === 'labels' ? '0.5cm' : '1cm'};
              justify-content: center;
            }
            .qr-container {
              border: 1px solid #ddd;
              border-radius: 4px;
              padding: ${selectedLayout === 'labels' ? '8px' : '12px'};
              text-align: center;
              background: white;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              page-break-inside: avoid;
              margin-bottom: ${selectedLayout === 'labels' ? '0.3cm' : '0.5cm'};
            }
            .qr-image {
              width: ${layoutConfig.qrSize};
              height: ${layoutConfig.qrSize};
              object-fit: contain;
              margin: 0 auto;
              display: block;
            }
            .box-id {
              font-weight: bold;
              margin-top: 8px;
              ${layoutConfig.fontSize}
            }
            .box-room {
              ${layoutConfig.fontSize}
              margin: 4px 0;
            }
            .box-contents {
              ${layoutConfig.fontSize}
              color: #666;
              margin-top: 4px;
              ${selectedLayout === 'labels' ? 'white-space: nowrap; overflow: hidden; text-overflow: ellipsis;' : ''}
              max-width: 100%;
            }
            .owner-tag {
              display: inline-block;
              padding: 2px 8px;
              border-radius: 12px;
              color: white;
              font-weight: 500;
              ${layoutConfig.fontSize}
              margin-bottom: 6px;
            }
            .footer {
              margin-top: 20px;
              text-align: center;
              font-size: 10px;
              color: #999;
              page-break-inside: avoid;
            }
            @media print {
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-header no-print">
            <div class="print-title">Box QR Codes (${boxesToPrint.length})</div>
            <div class="print-info">
              Automatically printing in 2 seconds...
            </div>
          </div>
          <div class="qr-grid">
    `;
    
    // Add each box to the grid
    boxesToPrint.forEach(box => {
      const qrDataUrl = qrCodesGenerated[box.id] || '';
      if (!qrDataUrl) return; // Skip boxes without generated QR codes
      
      const ownerColor = getOwnerColor(box.owner);
      
      html += `
        <div class="qr-container">
          <div class="owner-tag" style="background-color: ${ownerColor};">
            ${box.owner}
          </div>
          <img src="${qrDataUrl}" alt="QR Code for Box #${box.boxNumber}" class="qr-image" />
          <div class="box-id">Box #${box.boxNumber}</div>
          <div class="box-room">${box.room}</div>
          <div class="box-contents">${box.contents}</div>
        </div>
      `;
    });
    
    html += `
          </div>
          <div class="footer">
            Generated ${new Date().toLocaleString()}
          </div>
          <script>
            setTimeout(() => {
              window.print();
              setTimeout(() => window.close(), 500);
            }, 2000);
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  };
  
  // Using the getOwnerColor function from utils

  const filteredBoxes = getFilteredBoxes();
  
  return (
    <Card className="w-full max-w-3xl mx-auto bg-white shadow-lg border">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Print Multiple QR Codes</span>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </CardTitle>
        <CardDescription>
          Select boxes and print format to generate multiple QR codes at once
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Filter controls */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="space-y-2 w-full sm:w-1/2">
              <Label htmlFor="filter-select">Filter boxes</Label>
              <Select
                value={filterBy}
                onValueChange={(value) => setFilterBy(value as BoxFilter)}
              >
                <SelectTrigger id="filter-select" className="w-full">
                  <SelectValue placeholder="Select a filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Box Status</SelectLabel>
                    <SelectItem value="all">All Boxes</SelectItem>
                    <SelectItem value="packed">Packed</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                    <SelectItem value="loaded">Loaded</SelectItem>
                    <SelectItem value="out">Out for Delivery</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="selected">Selected Boxes Only</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 w-full sm:w-1/2">
              <Label htmlFor="layout-select">Print layout</Label>
              <Select
                value={selectedLayout}
                onValueChange={(value) => setSelectedLayout(value as PrintLayout)}
              >
                <SelectTrigger id="layout-select" className="w-full">
                  <SelectValue placeholder="Select a layout" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Layout Type</SelectLabel>
                    <SelectItem value="grid-2">2-up (Large)</SelectItem>
                    <SelectItem value="grid-4">4-up (Medium)</SelectItem>
                    <SelectItem value="grid-6">6-up (Small)</SelectItem>
                    <SelectItem value="labels">Label Sheet</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Box selection */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Select boxes to print</Label>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={selectAllBoxes}
                  disabled={filteredBoxes.length === 0}
                >
                  Select All
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={clearSelection}
                  disabled={selectedBoxes.size === 0}
                >
                  Clear
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-1" />
                      Options
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Print Options</DialogTitle>
                      <DialogDescription>
                        Customize how your QR codes will be printed
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="show-owner" />
                        <Label htmlFor="show-owner">Show owner name</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox id="show-contents" defaultChecked />
                        <Label htmlFor="show-contents">Show box contents</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox id="colorful" defaultChecked />
                        <Label htmlFor="colorful">Use color coding</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox id="add-border" defaultChecked />
                        <Label htmlFor="add-border">Add border to QR codes</Label>
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button type="submit">Save Changes</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            
            {isGenerating ? (
              <div className="bg-gray-50 rounded-md p-8 text-center">
                <div className="text-sm text-gray-500 animate-pulse">Generating QR codes...</div>
              </div>
            ) : filteredBoxes.length === 0 ? (
              <div className="bg-gray-50 rounded-md p-8 text-center">
                <div className="text-sm text-gray-500">No boxes match the current filter</div>
              </div>
            ) : (
              <div className="border rounded-md p-2 h-64 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {filteredBoxes.map(box => (
                    <div 
                      key={box.id}
                      className={`
                        border rounded-md p-2 flex items-center space-x-2 cursor-pointer
                        ${selectedBoxes.has(box.id) ? 'bg-primary/10 border-primary/30' : ''}
                      `}
                      onClick={() => toggleBoxSelection(box.id)}
                    >
                      <Checkbox 
                        checked={selectedBoxes.has(box.id)}
                        onCheckedChange={() => toggleBoxSelection(box.id)}
                        className="data-[state=checked]:bg-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">Box #{box.boxNumber}</div>
                        <div className="text-xs text-gray-500 truncate">{box.room} - {box.contents}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="text-sm text-gray-500 mt-2">
              {selectedBoxes.size === 0 ? 
                `Showing ${filteredBoxes.length} boxes` : 
                `Selected ${selectedBoxes.size} of ${filteredBoxes.length} boxes`}
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handlePrint}
          disabled={filteredBoxes.length === 0 || isGenerating}
          className="bg-primary hover:bg-primary/90"
        >
          <Printer className="mr-2 h-4 w-4" />
          {isGenerating ? 'Preparing QR Codes...' : 'Print QR Codes'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BatchQRPrint;