import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Box, Activity, BoxStatus } from "@shared/schema";
import { ownerColors } from "@/lib/utils";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import BoxCard from "@/components/box-card";
import BoxForm from "@/components/box-form";
import ActivityItem from "@/components/activity-item";

export default function Dashboard() {
  const { toast } = useToast();
  const [boxFormOpen, setBoxFormOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<string>("all");
  const [selectedRoom, setSelectedRoom] = useState<string>("all");

  // Fetch boxes
  const {
    data: boxes = [],
    isLoading: isLoadingBoxes,
    refetch: refetchBoxes,
  } = useQuery<Box[]>({
    queryKey: ["/api/boxes"],
  });

  // Fetch recent activities
  const {
    data: activities = [],
    isLoading: isLoadingActivities,
    refetch: refetchActivities,
  } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  // Calculate dashboard stats
  const stats = {
    totalBoxes: boxes.length,
    packed: boxes.filter((box) => box.status === BoxStatus.Packed).length,
    loaded: boxes.filter((box) => box.status === BoxStatus.Loaded).length,
    delivered: boxes.filter((box) => box.status === BoxStatus.Delivered).length,
  };

  // Filter boxes by status
  const packedBoxes = boxes
    .filter((box) => box.status === BoxStatus.Packed)
    .filter(
      (box) =>
        selectedOwner === "all" || box.owner.toLowerCase() === selectedOwner,
    )
    .filter((box) => selectedRoom === "all" || box.room === selectedRoom);

  const loadedBoxes = boxes
    .filter((box) => box.status === BoxStatus.Loaded)
    .filter(
      (box) =>
        selectedOwner === "all" || box.owner.toLowerCase() === selectedOwner,
    )
    .filter((box) => selectedRoom === "all" || box.room === selectedRoom);

  // Get next box number for new boxes
  const nextBoxNumber =
    boxes.length > 0 ? Math.max(...boxes.map((box) => box.boxNumber)) + 1 : 1;

  // Get unique room values from boxes
  const uniqueRooms = Array.from(new Set(boxes.map((box) => box.room)));

  // Handlers
  const handleBoxFormSuccess = () => {
    setBoxFormOpen(false);
    refetchBoxes();
    refetchActivities();
  };

  return (
    <div className="pb-20 md:pb-10">
      {/* Dashboard Summary */}
      <section className="mb-8">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-neutral-500 text-sm">Total Boxes</p>
              {isLoadingBoxes ? (
                <Skeleton className="h-8 w-16 mt-1" />
              ) : (
                <p className="text-2xl font-medium">{stats.totalBoxes}</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-neutral-500 text-sm">Packed</p>
              {isLoadingBoxes ? (
                <Skeleton className="h-8 w-16 mt-1" />
              ) : (
                <p className="text-2xl font-medium">{stats.packed}</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-neutral-500 text-sm">Loaded</p>
              {isLoadingBoxes ? (
                <Skeleton className="h-8 w-16 mt-1" />
              ) : (
                <p className="text-2xl font-medium">{stats.loaded}</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-neutral-500 text-sm">Delivered</p>
              {isLoadingBoxes ? (
                <Skeleton className="h-8 w-16 mt-1" />
              ) : (
                <p className="text-2xl font-medium">{stats.delivered}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">Recent Activity</h2>
          <button className="text-primary text-sm font-medium">View All</button>
        </div>

        <Card>
          <CardContent className="p-0 divide-y divide-neutral-100">
            {isLoadingActivities ? (
              Array(3)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="p-4">
                    <div className="flex items-start">
                      <Skeleton className="h-10 w-10 rounded-full mr-3" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                  </div>
                ))
            ) : activities.length > 0 ? (
              activities
                .slice(0, 3)
                .map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))
            ) : (
              <div className="p-4 text-center text-neutral-500">
                No recent activity
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Boxes by Status */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">Boxes by Status</h2>
          <div className="flex space-x-2">
            <Select value={selectedOwner} onValueChange={setSelectedOwner}>
              <SelectTrigger className="text-sm h-8 w-32">
                <SelectValue placeholder="All Owners" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Owners</SelectItem>
                <SelectItem value="john">John</SelectItem>
                <SelectItem value="lisa">Lisa</SelectItem>
                <SelectItem value="kids">Kids</SelectItem>
                <SelectItem value="shared">Shared</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedRoom} onValueChange={setSelectedRoom}>
              <SelectTrigger className="text-sm h-8 w-32">
                <SelectValue placeholder="All Rooms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rooms</SelectItem>
                {uniqueRooms.map((room) => (
                  <SelectItem key={room} value={room}>
                    {room}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Packed Boxes */}
        <div className="mb-6">
          <h3 className="text-md font-medium mb-3 text-neutral-700">Packed</h3>
          {isLoadingBoxes ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array(2)
                .fill(0)
                .map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Skeleton className="h-5 w-1/3" />
                          <Skeleton className="h-5 w-1/4" />
                        </div>
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-full" />
                        <div className="flex justify-between pt-2">
                          <Skeleton className="h-4 w-1/4" />
                          <Skeleton className="h-4 w-1/4" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : packedBoxes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {packedBoxes.map((box) => (
                <BoxCard
                  key={box.id}
                  box={box}
                  onEdit={() => {
                    toast({
                      title: "Edit box",
                      description:
                        "Editing functionality will be implemented in the Box Details page",
                    });
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center p-8 bg-white rounded-lg shadow">
              <p className="text-neutral-500">No packed boxes found</p>
            </div>
          )}
        </div>

        {/* Loaded Boxes */}
        <div className="mb-6">
          <h3 className="text-md font-medium mb-3 text-neutral-700">Loaded</h3>
          {isLoadingBoxes ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array(2)
                .fill(0)
                .map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Skeleton className="h-5 w-1/3" />
                          <Skeleton className="h-5 w-1/4" />
                        </div>
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-full" />
                        <div className="flex justify-between pt-2">
                          <Skeleton className="h-4 w-1/4" />
                          <Skeleton className="h-4 w-1/4" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : loadedBoxes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loadedBoxes.map((box) => (
                <BoxCard key={box.id} box={box} />
              ))}
            </div>
          ) : (
            <div className="text-center p-8 bg-white rounded-lg shadow">
              <p className="text-neutral-500">No loaded boxes found</p>
            </div>
          )}
        </div>
      </section>

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

      {/* Floating Action Button */}
      <div className="fixed right-6 bottom-20 md:bottom-6">
        <Button
          onClick={() => setBoxFormOpen(true)}
          className="bg-secondary hover:bg-secondary-dark text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg"
        >
          <span className="material-icons">add</span>
        </Button>
      </div>
    </div>
  );
}
