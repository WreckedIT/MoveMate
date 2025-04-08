import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats, Html5QrcodeScannerState } from 'html5-qrcode';
import { 
  ArrowLeft, 
  FlashlightOff, 
  LightbulbOff,
  CameraOff,
  SwitchCamera,
  Upload,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { parseQrCodeData } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface QRScannerProps {
  onScan: (boxId: number) => void;
  onClose: () => void;
}

const QRScanner = ({ onScan, onClose }: QRScannerProps) => {
  const { toast } = useToast();
  const [flashOn, setFlashOn] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string>('');
  const [hasFlash, setHasFlash] = useState(false);
  const [cameraId, setCameraId] = useState<string>('');
  const [cameras, setCameras] = useState<Array<{ id: string, label: string }>>([]);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerContainerId = 'qr-scanner-container';

  useEffect(() => {
    // Initialize scanner
    scannerRef.current = new Html5Qrcode(scannerContainerId, {
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      verbose: false,
    });

    // Get list of cameras
    Html5Qrcode.getCameras().then((devices) => {
      const availableCameras = devices.map(device => ({ 
        id: device.id, 
        label: device.label || `Camera ${device.id}` 
      }));
      setCameras(availableCameras);
      
      // Default to rear camera if available
      const rearCamera = availableCameras.find(cam => 
        cam.label.toLowerCase().includes('back') || 
        cam.label.toLowerCase().includes('rear')
      );
      
      if (rearCamera) {
        setCameraId(rearCamera.id);
      } else if (availableCameras.length > 0) {
        setCameraId(availableCameras[0].id);
      }
    }).catch(err => {
      console.error('Error getting cameras', err);
      setError('Failed to get camera list. Please check camera permissions.');
    });

    // Cleanup on unmount
    return () => {
      if (scannerRef.current && 
          scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
        scannerRef.current.stop().catch((err) => {
          console.error('Error stopping scanner:', err);
        });
      }
    };
  }, []);

  // When cameraId changes, start scanner with the new camera
  useEffect(() => {
    if (cameraId) {
      startScanner();
    }
  }, [cameraId]);

  const startScanner = async () => {
    if (!scannerRef.current || !cameraId) return;

    // If already scanning, stop first
    if (scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
      try {
        await scannerRef.current.stop();
        // Small delay to ensure camera properly closed
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }

    const config = {
      fps: 15,
      qrbox: { width: 250, height: 250 },
      aspectRatio: window.innerWidth / window.innerHeight,
      disableFlip: false,
    };

    try {
      setScanning(true);
      setError('');
      setFlashOn(false);

      await scannerRef.current.start(
        { deviceId: cameraId },
        config,
        onQrCodeSuccess,
        onQrCodeError
      );

      // Check if torch is available
      try {
        const torchAvailable = await scannerRef.current.isTorchAvailable();
        setHasFlash(torchAvailable);
      } catch (err) {
        console.log('Torch detection error:', err);
        setHasFlash(false);
      }
    } catch (err) {
      console.error('Failed to start scanner:', err);
      setError('Failed to start camera. Please ensure camera permissions are granted.');
      setScanning(false);
    }
  };

  const switchCamera = async () => {
    if (cameras.length <= 1) {
      toast({
        title: "No other cameras available",
        description: "This device only has one camera.",
        variant: "destructive"
      });
      return;
    }

    // Find the next camera in the list
    const currentIndex = cameras.findIndex(cam => cam.id === cameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setCameraId(cameras[nextIndex].id);
  };

  const onQrCodeSuccess = (decodedText: string) => {
    console.log('QR code detected:', decodedText);
    
    const boxId = parseQrCodeData(decodedText);
    
    if (boxId) {
      // Stop scanner after successful scan
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
      
      // Show success toast
      toast({
        title: "QR Code Detected",
        description: `Recognized Box #${boxId}`,
        variant: "success"
      });
      
      // Call the callback with the box ID
      onScan(boxId);
    } else {
      setError('Invalid QR code format. Please scan a valid box QR code.');
      
      // Vibrate to alert user of invalid scan
      if (navigator.vibrate) {
        navigator.vibrate([100, 100, 100]);
      }
    }
  };

  const onQrCodeError = (err: unknown) => {
    // This is normal scanning behavior when no QR code is detected
    // We'll only log actual errors
    if (err && typeof err === 'object' && 'message' in err && 
        typeof err.message === 'string' && 
        !err.message.includes('No QR code found')) {
      console.error('QR code scanning error:', err);
    }
  };

  const toggleFlash = async () => {
    if (!scannerRef.current || !scanning) return;

    try {
      if (flashOn) {
        await scannerRef.current.torch(false);
      } else {
        await scannerRef.current.torch(true);
      }
      setFlashOn(!flashOn);
    } catch (err) {
      console.error('Failed to toggle flash:', err);
      toast({
        title: "Flash not available",
        description: "Flash/torch is not supported on this device",
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !scannerRef.current) return;
    
    try {
      setError('');
      
      // If currently scanning, stop
      if (scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
        scannerRef.current.stop().catch(console.error);
        setScanning(false);
      }
      
      // Scan the uploaded image
      scannerRef.current.scanFile(file, true)
        .then((decodedText) => {
          const boxId = parseQrCodeData(decodedText);
          
          if (boxId) {
            toast({
              title: "QR Code Detected",
              description: `Recognized Box #${boxId} from image`,
              variant: "success"
            });
            onScan(boxId);
          } else {
            setError('This image does not contain a valid box QR code');
            
            // Restart scanner
            startScanner();
          }
        })
        .catch((err) => {
          console.error('Error scanning file:', err);
          setError('No QR code found in this image. Please try another image or use the camera.');
          
          // Restart scanner
          startScanner();
        });
        
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Error processing file:', err);
      setError('Error processing the image. Please try again.');
      startScanner();
    }
  };

  const restartScanner = () => {
    setError('');
    startScanner();
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50">
      <div className="flex justify-between items-center p-4 bg-gradient-to-b from-black to-transparent">
        <Button
          variant="ghost"
          className="text-white p-2"
          onClick={onClose}
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h2 className="text-white font-medium">Scan Box QR Code</h2>
        <div className="flex space-x-1">
          <TooltipProvider>
            {hasFlash && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white"
                    onClick={toggleFlash}
                  >
                    {flashOn ? <LightbulbOff className="h-5 w-5" /> : <FlashlightOff className="h-5 w-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{flashOn ? 'Turn off flash' : 'Turn on flash'}</p>
                </TooltipContent>
              </Tooltip>
            )}
          
            {cameras.length > 1 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white"
                    onClick={switchCamera}
                  >
                    <SwitchCamera className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Switch camera</p>
                </TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center bg-black">
        {/* QR scanner container */}
        <div 
          id={scannerContainerId} 
          className="w-full max-w-md aspect-square relative"
        >
          {!scanning && (
            <div className="absolute inset-0 flex items-center justify-center">
              <CameraOff className="h-16 w-16 text-white opacity-50" />
            </div>
          )}
        </div>
        
        {/* Scanning viewfinder overlay */}
        <div className="relative w-5/6 max-w-xs aspect-square border-2 border-white rounded-lg absolute pointer-events-none">
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary -translate-x-1 -translate-y-1"></div>
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary translate-x-1 -translate-y-1"></div>
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary -translate-x-1 translate-y-1"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary translate-x-1 translate-y-1"></div>
          
          <div className="absolute top-0 left-0 right-0 h-1 bg-primary/80" 
               style={{ animation: 'scanAnimation 2s infinite' }}></div>
        </div>
        
        {/* Helper text */}
        <p className="text-white text-sm mt-4 text-center px-6">
          Position the QR code within the frame to scan
        </p>
        
        {/* Error message if any */}
        {error && (
          <div className="bg-red-500/80 text-white p-3 rounded-md mt-4 mx-4 text-sm flex items-center justify-between">
            <span>{error}</span>
            <Button 
              variant="ghost" 
              size="sm"
              className="text-white p-1 h-auto ml-2"
              onClick={restartScanner}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        {/* Alternative scanning options */}
        <div className="mt-6 mb-8 flex justify-center">
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <Button 
              variant="secondary"
              className="bg-white/10 text-white hover:bg-white/20"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Scan from Image
            </Button>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes scanAnimation {
          0% { top: 0; }
          50% { top: calc(100% - 4px); }
          100% { top: 0; }
        }
      `}</style>
    </div>
  );
};

export default QRScanner;
