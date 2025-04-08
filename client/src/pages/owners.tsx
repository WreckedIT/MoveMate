import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { getQueryFn, queryClient } from '@/lib/queryClient';

// Schema for owner data
const ownerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  color: z.string().regex(/^#([0-9A-F]{6})$/i, 'Must be a valid hex color code (e.g., #FF5733)')
});

type FormData = z.infer<typeof ownerSchema>;

export default function Owners() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<any>(null);

  // Query to get all owners
  const { data: owners, isLoading } = useQuery({
    queryKey: ['/api/owners'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  // Form for create/edit
  const form = useForm<FormData>({
    resolver: zodResolver(ownerSchema),
    defaultValues: {
      name: '',
      color: '#3B82F6'
    }
  });

  // Reset form when dialog is opened for creating
  useEffect(() => {
    if (isCreateDialogOpen) {
      form.reset({
        name: '',
        color: '#3B82F6'
      });
    }
  }, [isCreateDialogOpen, form]);

  // Update form when dialog is opened for editing
  useEffect(() => {
    if (isEditDialogOpen && selectedOwner) {
      form.reset({
        name: selectedOwner.name,
        color: selectedOwner.color
      });
    }
  }, [isEditDialogOpen, selectedOwner, form]);

  // Create owner mutation
  const createOwnerMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch('/api/owners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create owner');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/owners'] });
      setIsCreateDialogOpen(false);
    },
  });

  // Update owner mutation
  const updateOwnerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: FormData }) => {
      const response = await fetch(`/api/owners/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update owner');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/owners'] });
      setIsEditDialogOpen(false);
    },
  });

  // Delete owner mutation
  const deleteOwnerMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/owners/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete owner');
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/owners'] });
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      alert(error.message);
      setIsDeleteDialogOpen(false);
    }
  });

  const onSubmit = (data: FormData) => {
    if (isEditDialogOpen && selectedOwner) {
      updateOwnerMutation.mutate({ id: selectedOwner.id, data });
    } else {
      createOwnerMutation.mutate(data);
    }
  };

  const handleDelete = () => {
    if (selectedOwner) {
      deleteOwnerMutation.mutate(selectedOwner.id);
    }
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Owner Management</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Owner
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center">
          <p>Loading owners...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {owners && owners.map((owner: any) => (
            <Card key={owner.id} className="overflow-hidden">
              <div className="h-2" style={{ backgroundColor: owner.color }}></div>
              <CardHeader className="pb-2">
                <CardTitle className="flex justify-between items-center">
                  <span>{owner.name}</span>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedOwner(owner);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedOwner(owner);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <div
                    className="h-6 w-6 rounded-full"
                    style={{ backgroundColor: owner.color }}
                  ></div>
                  <span className="text-sm font-mono">{owner.color}</span>
                </div>
              </CardContent>
            </Card>
          ))}

          {owners && owners.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No owners found. Create one to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateDialogOpen || isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isCreateDialogOpen ? 'Create Owner' : 'Edit Owner'}
            </DialogTitle>
            <DialogDescription>
              {isCreateDialogOpen
                ? 'Add a new owner with a custom color.'
                : 'Update the owner information.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter owner name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <div className="flex space-x-2">
                      <FormControl>
                        <Input type="color" {...field} className="w-16 p-1 h-9" />
                      </FormControl>
                      <FormControl>
                        <Input
                          placeholder="#RRGGBB"
                          {...field}
                          className="font-mono"
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setIsEditDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createOwnerMutation.isPending || updateOwnerMutation.isPending
                  }
                >
                  {createOwnerMutation.isPending || updateOwnerMutation.isPending
                    ? 'Saving...'
                    : isCreateDialogOpen
                    ? 'Create'
                    : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the owner "{selectedOwner?.name}".
              <br /><br />
              <strong>Warning:</strong> This action cannot be completed if there are boxes associated with this owner.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteOwnerMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteOwnerMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}