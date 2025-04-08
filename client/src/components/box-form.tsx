import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Box, BoxStatus, insertBoxSchema } from '@shared/schema';
import { roomOptions, fetchOwners, Owner } from '@/lib/utils';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

const formSchema = insertBoxSchema.extend({
  // Add any additional validation rules
});

type FormData = z.infer<typeof formSchema>;

interface BoxFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  existingBox?: Box;
  nextBoxNumber?: number;
}

const BoxForm = ({ onSuccess, onCancel, existingBox, nextBoxNumber = 1 }: BoxFormProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [isLoadingOwners, setIsLoadingOwners] = useState(true);
  
  // Fetch owners when component mounts
  useEffect(() => {
    const getOwners = async () => {
      setIsLoadingOwners(true);
      try {
        const ownersData = await fetchOwners();
        setOwners(ownersData);
      } catch (error) {
        console.error('Error fetching owners:', error);
        toast({
          title: 'Error',
          description: 'Failed to load owners. Using default options.',
          variant: 'destructive'
        });
      } finally {
        setIsLoadingOwners(false);
      }
    };
    
    getOwners();
  }, [toast]);
  
  // Determine if we're editing or creating
  const isEditing = !!existingBox;
  
  // Setup form with default values
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditing
      ? {
          boxNumber: existingBox.boxNumber,
          owner: existingBox.owner,
          room: existingBox.room,
          contents: existingBox.contents,
          status: existingBox.status
        }
      : {
          boxNumber: nextBoxNumber,
          owner: '',  // Leave empty initially, will be updated when owners load
          room: 'Kitchen',
          contents: '',
          status: BoxStatus.Packed
        }
  });
  
  // Update the default owner value when owners are loaded
  useEffect(() => {
    if (!isEditing && owners.length > 0 && !form.getValues('owner')) {
      form.setValue('owner', owners[0].name);
    }
  }, [owners, isEditing, form]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    
    try {
      if (isEditing) {
        // Update existing box
        await apiRequest('PUT', `/api/boxes/${existingBox.id}`, data);
        toast({
          title: 'Box updated',
          description: `Box #${data.boxNumber} has been updated successfully.`
        });
      } else {
        // Create new box
        await apiRequest('POST', '/api/boxes', data);
        toast({
          title: 'Box created',
          description: `Box #${data.boxNumber} has been created successfully.`
        });
      }
      
      onSuccess();
    } catch (error) {
      console.error('Error saving box:', error);
      toast({
        title: 'Error',
        description: `Failed to ${isEditing ? 'update' : 'create'} box. Please try again.`,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="boxNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Box Number</FormLabel>
              <div className="flex">
                <span className="inline-flex items-center px-3 bg-neutral-100 text-neutral-500 border border-r-0 border-neutral-300 rounded-l-md">#</span>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    className="rounded-l-none"
                    value={field.value}
                    readOnly={true}
                  />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="owner"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Owner</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isLoadingOwners || owners.length === 0}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingOwners ? "Loading owners..." : "Select owner"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {owners.length > 0 ? (
                    owners.map(owner => (
                      <SelectItem key={owner.id} value={owner.name}>
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: owner.color }}
                          />
                          {owner.name}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-owners" disabled>No owners available</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
              {owners.length === 0 && !isLoadingOwners && (
                <p className="text-xs text-muted-foreground mt-1">
                  <span 
                    className="underline cursor-pointer text-primary" 
                    onClick={() => window.location.href = '/owners'}
                  >
                    Manage owners
                  </span> to create custom options
                </p>
              )}
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="room"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Room</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {roomOptions.map(room => (
                    <SelectItem key={room} value={room}>{room}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="contents"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contents</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="List the contents of this box..."
                  className="h-20"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={BoxStatus.Packed}>Packed</SelectItem>
                  <SelectItem value={BoxStatus.Staging}>Staging</SelectItem>
                  <SelectItem value={BoxStatus.Loaded}>Loaded</SelectItem>
                  {isEditing && (
                    <>
                      <SelectItem value={BoxStatus.Out}>Unloaded</SelectItem>
                      <SelectItem value={BoxStatus.Delivered}>Delivered</SelectItem>
                      <SelectItem value={BoxStatus.Unpacked}>Unpacked</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="mt-6 flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-primary text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Box' : 'Save Box'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default BoxForm;
