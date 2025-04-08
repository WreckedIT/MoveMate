import { formatRelative } from 'date-fns';
import { Activity } from '@shared/schema';

interface ActivityItemProps {
  activity: Activity;
}

const ActivityItem = ({ activity }: ActivityItemProps) => {
  const getActivityIcon = (type: string) => {
    switch(type) {
      case 'created':
        return (
          <div className="bg-secondary bg-opacity-10 rounded-full p-2 mr-3">
            <span className="material-icons text-secondary">inventory_2</span>
          </div>
        );
      case 'loaded':
        return (
          <div className="bg-info bg-opacity-10 rounded-full p-2 mr-3">
            <span className="material-icons text-info">local_shipping</span>
          </div>
        );
      case 'delivered':
        return (
          <div className="bg-success bg-opacity-10 rounded-full p-2 mr-3">
            <span className="material-icons text-success">check_circle</span>
          </div>
        );
      case 'unloaded':
        return (
          <div className="bg-warning bg-opacity-10 rounded-full p-2 mr-3">
            <span className="material-icons text-warning">exit_to_app</span>
          </div>
        );
      case 'unpacked':
        return (
          <div className="bg-neutral-400 bg-opacity-10 rounded-full p-2 mr-3">
            <span className="material-icons text-neutral-400">delete_outline</span>
          </div>
        );
      default:
        return (
          <div className="bg-primary bg-opacity-10 rounded-full p-2 mr-3">
            <span className="material-icons text-primary">edit</span>
          </div>
        );
    }
  };
  
  // Format relative timestamp
  const timeAgo = formatRelative(new Date(activity.timestamp), new Date());
  
  return (
    <div className="p-4 hover:bg-neutral-50">
      <div className="flex items-start">
        {getActivityIcon(activity.type)}
        <div className="flex-1">
          <p className="font-medium">{activity.description}</p>
          <p className="text-sm text-neutral-500">{timeAgo}</p>
        </div>
      </div>
    </div>
  );
};

export default ActivityItem;
