import { useState } from 'react';
import { useLocation } from 'wouter';
import { Box, BoxStatus } from '@shared/schema';
import { Edit, QrCode, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import QRCodeDisplay from '@/components/qr-code';
import { formatPosition, getStatusDisplay, getOwnerColor } from '@/lib/utils';

interface BoxCardProps {
  box: Box;
  onEdit?: () => void;
}

const BoxCard = ({ box, onEdit }: BoxCardProps) => {
  const [_, navigate] = useLocation();
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  
  const ownerColor = getOwnerColor(box.owner);
  const { text: statusText, className: statusClass } = getStatusDisplay(box.status);
  
  const handleViewBox = () => {
    navigate(`/boxes/${box.id}`);
  };
  
  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-2" style={{backgroundColor: ownerColor}}></div>
              <h4 className="font-medium">Box #{box.boxNumber}</h4>
            </div>
            <span className={statusClass}>{statusText}</span>
          </div>
          <p className="text-sm text-neutral-600 mb-2">{box.room}</p>
          <p className="text-sm text-neutral-500 line-clamp-2">{box.contents}</p>
          
          {/* Position info for loaded boxes */}
          {box.status === BoxStatus.Loaded && box.position && (
            <div className="mt-3">
              <div className="flex justify-between">
                <div className="flex items-start bg-neutral-100 py-1 px-2 rounded">
                  <span className="text-sm text-neutral-500 mr-1">📍</span>
                  <span className="text-xs font-medium text-neutral-700">
                    {formatPosition(box.position)}
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-primary text-sm font-medium p-0"
                  onClick={handleViewBox}
                >
                  <Eye className="h-4 w-4 mr-1" /> View
                </Button>
              </div>
            </div>
          )}
          
          {/* Actions for boxes not in the truck */}
          {box.status !== BoxStatus.Loaded && (
            <div className="mt-3 flex justify-between">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-primary text-sm font-medium p-0"
                onClick={() => setQrDialogOpen(true)}
              >
                <QrCode className="h-4 w-4 mr-1" /> Scan
              </Button>
              
              {onEdit && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-primary text-sm font-medium p-0"
                  onClick={onEdit}
                >
                  <Edit className="h-4 w-4 mr-1" /> Edit
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-md">
          <h3 className="text-lg font-medium p-2">Box #{box.boxNumber} QR Code</h3>
          <QRCodeDisplay box={box} />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BoxCard;
