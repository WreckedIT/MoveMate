import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, BoxStatus } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { downloadCsv, formatPosition } from '@/lib/utils';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

type ExportFormat = 'csv' | 'excel' | 'pdf';
type BoxFilter = 'all' | BoxStatus;

export default function ExportData() {
  const { toast } = useToast();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');
  const [selectedFilter, setSelectedFilter] = useState<BoxFilter>('all');
  
  // Fetch boxes
  const { 
    data: boxes = [], 
    isLoading
  } = useQuery<Box[]>({ 
    queryKey: ['/api/boxes'] 
  });
  
  // Filter boxes based on selection
  const getFilteredBoxes = () => {
    if (selectedFilter === 'all') return boxes;
    return boxes.filter(box => box.status === selectedFilter);
  };
  
  // Generate preview data for table
  const previewData = getFilteredBoxes()
    .map(box => ({
      'Box #': box.boxNumber,
      'Owner': box.owner,
      'Room': box.room,
      'Contents': box.contents,
      'Status': box.status,
      'Location': box.position ? formatPosition(box.position) : '-'
    }))
    .slice(0, 5); // Show only first 5 for preview
  
  // Handle export generation
  const handleGenerateExport = () => {
    if (isLoading || boxes.length === 0) {
      toast({
        title: "Error",
        description: "No data available to export",
        variant: "destructive"
      });
      return;
    }
    
    // Prepare data for export
    const exportData = getFilteredBoxes().map(box => ({
      'Box #': box.boxNumber,
      'Owner': box.owner,
      'Room': box.room,
      'Contents': box.contents,
      'Status': box.status,
      'Location': box.position ? formatPosition(box.position) : '-'
    }));
    
    // Generate filename
    const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
    const filename = `boxtracker_export_${timestamp}.csv`;
    
    try {
      // Currently only CSV is implemented
      if (selectedFormat === 'csv') {
        downloadCsv(exportData, filename);
        
        toast({
          title: "Export successful",
          description: `${exportData.length} boxes exported to ${filename}`
        });
      } else {
        toast({
          title: "Export format not supported",
          description: `${selectedFormat} export is not yet implemented.`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "An error occurred while generating the export",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto pb-20 md:pb-0">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Export Data</h1>
        <p className="text-neutral-500 mt-1">
          Export your box data in various formats
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Export Options</CardTitle>
            <CardDescription>
              Select what data you want to export and the format
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              <div className="space-y-2">
                <Label>Data to Export</Label>
                <Select
                  value={selectedFilter}
                  onValueChange={(value) => setSelectedFilter(value as BoxFilter)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select data to export" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Boxes</SelectItem>
                    <SelectItem value={BoxStatus.Packed}>Packed Boxes Only</SelectItem>
                    <SelectItem value={BoxStatus.Loaded}>Loaded Boxes Only</SelectItem>
                    <SelectItem value={BoxStatus.Delivered}>Delivered Boxes Only</SelectItem>
                    <SelectItem value={BoxStatus.Unpacked}>Unpacked Boxes Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Export Format</Label>
                <RadioGroup
                  value={selectedFormat}
                  onValueChange={(value) => setSelectedFormat(value as ExportFormat)}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="csv" id="csv" />
                    <Label htmlFor="csv">CSV</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="excel" id="excel" disabled />
                    <Label htmlFor="excel" className="text-neutral-400">Excel</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pdf" id="pdf" disabled />
                    <Label htmlFor="pdf" className="text-neutral-400">PDF</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="flex justify-end">
                <Button
                  type="button"
                  className="bg-primary"
                  onClick={handleGenerateExport}
                  disabled={isLoading}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Generate Export
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Data Preview</CardTitle>
            <CardDescription>
              Preview of the data that will be exported
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : previewData.length > 0 ? (
              <div className="border border-neutral-200 rounded-md overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200">
                  <thead className="bg-neutral-50">
                    <tr>
                      {Object.keys(previewData[0]).map((header) => (
                        <th 
                          key={header}
                          className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-neutral-200 text-sm">
                    {previewData.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {Object.values(row).map((value, cellIndex) => (
                          <td 
                            key={cellIndex}
                            className="px-3 py-2 whitespace-nowrap"
                          >
                            {value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center p-8 border border-neutral-200 rounded-md">
                <p className="text-neutral-500">No data available for preview</p>
              </div>
            )}
            
            {previewData.length > 0 && getFilteredBoxes().length > previewData.length && (
              <div className="mt-2 text-right text-sm text-neutral-500">
                Showing {previewData.length} of {getFilteredBoxes().length} boxes
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
