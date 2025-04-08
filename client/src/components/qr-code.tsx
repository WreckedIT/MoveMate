import { useRef, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { generateQrCodeData, getOwnerColor } from '@/lib/utils';
import { Box } from '@shared/schema';
import { Printer, Share2, Download, QrCode, Maximize } from 'lucide-react';

interface QRCodeDisplayProps {
  box: Box;
  ownerColor?: string; // Optional, since we'll use getOwnerColor if not provided
}

// Print template types
type PrintTemplate = 'standard' | 'large' | 'compact' | 'multiple';

const QRCodeDisplay = ({ box }: QRCodeDisplayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [printTemplate, setPrintTemplate] = useState<PrintTemplate>('standard');
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (canvasRef.current && box) {
      const qrData = generateQrCodeData(box.id);
      
      QRCode.toCanvas(
        canvasRef.current,
        qrData,
        {
          width: 200,
          margin: 1,
          color: {
            dark: '#000',
            light: '#FFF',
          },
        },
        (error) => {
          if (error) console.error("Error generating QR code:", error);
        }
      );
    }
  }, [box]);

  // Using getOwnerColor from utils

  const handlePrint = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const printWindow = window.open('', '', 'height=600,width=800');
    
    if (!printWindow) {
      alert('Please allow pop-ups to print QR codes');
      return;
    }
    
    const colorHex = getOwnerColor(box.owner);
    
    let html = `
      <html>
        <head>
          <title>Print QR Code - Box #${box.boxNumber}</title>
          <style>
            @media print {
              @page {
                size: ${printTemplate === 'large' ? 'letter' : 'auto'};
                margin: 0.5cm;
              }
              body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
            body { 
              font-family: sans-serif; 
              text-align: center;
              margin: 0;
              padding: 20px;
            }
            .qr-container {
              border: 2px solid #ddd;
              display: inline-block;
              padding: 15px;
              background: white;
              margin-bottom: 10px;
              box-shadow: 0 2px 6px rgba(0,0,0,0.1);
              border-radius: 8px;
              ${printTemplate === 'large' ? 'width: 90%; max-width: 500px;' : ''}
            }
            .box-info {
              margin-top: 10px;
              text-align: center;
            }
            .owner-label {
              background-color: ${colorHex};
              color: white;
              padding: 4px 12px;
              border-radius: 16px;
              display: inline-block;
              margin-bottom: 8px;
              font-size: ${printTemplate === 'compact' ? '12px' : '14px'};
              font-weight: bold;
            }
            .container {
              display: ${printTemplate === 'multiple' ? 'grid' : 'block'};
              ${printTemplate === 'multiple' ? 'grid-template-columns: repeat(2, 1fr); gap: 20px;' : ''}
              justify-content: center;
              align-items: start;
            }
            h4 { margin: 8px 0; font-size: ${printTemplate === 'large' ? '18px' : printTemplate === 'compact' ? '14px' : '16px'}; }
            p { margin: 4px 0; color: #52606d; font-size: ${printTemplate === 'compact' ? '12px' : '14px'}; }
            .qr-image {
              width: ${printTemplate === 'large' ? '300px' : printTemplate === 'compact' ? '120px' : '200px'};
              height: ${printTemplate === 'large' ? '300px' : printTemplate === 'compact' ? '120px' : '200px'};
            }
            .box-id {
              font-size: 24px;
              font-weight: bold;
              margin-top: 10px;
              ${printTemplate === 'large' ? 'font-size: 36px;' : printTemplate === 'compact' ? 'font-size: 18px;' : ''}
            }
            .instructions {
              font-size: 12px;
              margin-top: 20px;
              color: #666;
              text-align: center;
              font-style: italic;
            }
          </style>
        </head>
        <body>
          <div class="container">
    `;

    // Create content based on the selected template
    if (printTemplate === 'multiple') {
      // Add multiple copies of the QR code
      for (let i = 0; i < 4; i++) {
        html += `
          <div class="qr-container">
            <div class="owner-label">${box.owner}'s Box</div>
            <img src="${canvas.toDataURL()}" alt="QR Code" class="qr-image" />
            <div class="box-info">
              <div class="box-id">#${box.boxNumber}</div>
              <h4>${box.room}</h4>
              <p>${box.contents}</p>
            </div>
          </div>
        `;
      }
    } else {
      // Add a single QR code with the selected template
      html += `
        <div class="qr-container">
          <div class="owner-label">${box.owner}'s Box</div>
          <img src="${canvas.toDataURL()}" alt="QR Code" class="qr-image" />
          <div class="box-info">
            <div class="box-id">#${box.boxNumber}</div>
            <h4>${box.room}</h4>
            <p>${box.contents}</p>
          </div>
        </div>
      `;
    }

    html += `
            <div class="instructions">
              Scan this QR code with the Moving App to track this box
            </div>
          </div>
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 500);
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleShare = async () => {
    if (!canvasRef.current || !navigator.share) return;
    
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        
        const file = new File([blob], `box-${box.boxNumber}-qr.png`, { type: 'image/png' });
        
        await navigator.share({
          title: `Box #${box.boxNumber} QR Code`,
          text: `Box #${box.boxNumber} - ${box.room} - ${box.contents}`,
          files: [file]
        });
      });
    } catch (error) {
      console.error('Error sharing QR code:', error);
    }
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    
    setIsDownloading(true);
    
    try {
      const canvas = canvasRef.current;
      const image = canvas.toDataURL("image/png");
      
      const link = document.createElement('a');
      link.href = image;
      link.download = `box-${box.boxNumber}-qr.png`;
      link.click();
    } catch (error) {
      console.error('Error downloading QR code:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const openFullScreen = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const fullScreenWindow = window.open('', '', 'height=600,width=600');
    
    if (!fullScreenWindow) {
      alert('Please allow pop-ups to view QR codes in full screen');
      return;
    }
    
    fullScreenWindow.document.write(`
      <html>
        <head>
          <title>Box #${box.boxNumber} QR Code</title>
          <style>
            body { 
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0;
              padding: 20px;
              min-height: 100vh;
              background-color: white;
            }
            img {
              max-width: 90vmin;
              max-height: 90vmin;
            }
          </style>
        </head>
        <body>
          <img src="${canvas.toDataURL()}" alt="QR Code" />
        </body>
      </html>
    `);
    
    fullScreenWindow.document.close();
  };

  return (
    <div className="p-6 flex flex-col items-center">
      <div className="text-white px-3 py-1 rounded-md mb-3" style={{backgroundColor: getOwnerColor(box.owner)}}>
        {box.owner}'s Box
      </div>
      <div className="w-48 h-48 bg-white border border-neutral-200 flex items-center justify-center mb-4 relative group">
        <canvas ref={canvasRef} />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white"
            onClick={openFullScreen}
          >
            <Maximize className="h-5 w-5" />
          </Button>
        </div>
      </div>
      <div className="text-center mb-4">
        <h4 className="font-medium">Box #{box.boxNumber} - {box.room}</h4>
        <p className="text-sm text-neutral-500">{box.contents}</p>
      </div>
      
      <div className="flex flex-col space-y-2 w-full max-w-xs">
        <Dialog>
          <DialogTrigger asChild>
            <Button className="w-full bg-primary hover:bg-primary/90 text-white">
              <Printer className="mr-2 h-4 w-4" /> Print QR Code
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Print QR Code for Box #{box.boxNumber}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">Select print format:</h4>
                <RadioGroup 
                  value={printTemplate} 
                  onValueChange={(value) => setPrintTemplate(value as PrintTemplate)}
                  className="grid grid-cols-1 gap-2"
                >
                  <div className="flex items-center space-x-2 border rounded-md p-2">
                    <RadioGroupItem value="standard" id="standard" />
                    <Label htmlFor="standard" className="flex-1 cursor-pointer">
                      <div className="font-medium">Standard</div>
                      <div className="text-xs text-neutral-500">Regular sized QR code with box details</div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 border rounded-md p-2">
                    <RadioGroupItem value="large" id="large" />
                    <Label htmlFor="large" className="flex-1 cursor-pointer">
                      <div className="font-medium">Large</div>
                      <div className="text-xs text-neutral-500">Extra large QR code for better scanning</div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 border rounded-md p-2">
                    <RadioGroupItem value="compact" id="compact" />
                    <Label htmlFor="compact" className="flex-1 cursor-pointer">
                      <div className="font-medium">Compact</div>
                      <div className="text-xs text-neutral-500">Smaller size to save paper</div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 border rounded-md p-2">
                    <RadioGroupItem value="multiple" id="multiple" />
                    <Label htmlFor="multiple" className="flex-1 cursor-pointer">
                      <div className="font-medium">Multiple (4-up)</div>
                      <div className="text-xs text-neutral-500">Print 4 copies on one page</div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              <Separator className="my-4" />
              
              <div className="text-xs text-neutral-500 mb-4">
                <p>The QR code will open in a new window for printing. Make sure pop-ups are allowed in your browser.</p>
              </div>
            </div>
            <DialogFooter className="flex justify-between sm:justify-between">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" /> Print
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <div className="flex space-x-2">
          <Button 
            onClick={handleDownload}
            variant="outline" 
            className="flex-1 border border-neutral-300 text-neutral-700"
            disabled={isDownloading}
          >
            <Download className="mr-2 h-4 w-4" /> 
            {isDownloading ? 'Downloading...' : 'Download'}
          </Button>
          
          {navigator.share && (
            <Button 
              onClick={handleShare} 
              variant="outline" 
              className="flex-1 border border-neutral-300 text-neutral-700"
            >
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRCodeDisplay;
