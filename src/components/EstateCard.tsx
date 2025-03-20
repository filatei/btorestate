import React from 'react';
import { Building2, Users, Clock, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';

interface Estate {
  id: string;
  name: string;
  address: string;
  type: string;
  memberCount: number;
  createdAt: any;
  members: string[];
  admins: string[];
  pendingRequests?: string[];
}

interface EstateCardProps {
  estate: Estate;
  currentUserId: string;
  onViewMembers: () => void;
  onViewRequests: () => void;
  onViewDashboard: () => void;
  onCreateCharge?: () => void;
  onAdminPanel?: () => void;
}

export function EstateCard({
  estate,
  currentUserId,
  onViewMembers,
  onViewRequests,
  onViewDashboard,
  onCreateCharge,
  onAdminPanel
}: EstateCardProps) {
  const isAdmin = estate.admins?.includes(currentUserId);
  const pendingRequestsCount = estate.pendingRequests?.length || 0;
  const memberStatus = estate.members.includes(currentUserId) ? 'active' : 'passive';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold">{estate.name}</h3>
            <p className="text-sm text-muted-foreground">{estate.address}</p>
          </div>
          <Badge variant="outline">{estate.type}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewMembers}
              className="hover:bg-accent"
            >
              <Users className="h-4 w-4 mr-2" />
              {estate.memberCount} {estate.memberCount === 1 ? 'member' : 'members'}
            </Button>
            <Badge variant={memberStatus === 'active' ? 'success' : 'warning'}>
              {memberStatus}
            </Badge>
          </div>
          {isAdmin && pendingRequestsCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onViewRequests}
              className="w-full"
            >
              <Bell className="h-4 w-4 mr-2" />
              {pendingRequestsCount} Pending Request{pendingRequestsCount !== 1 && 's'}
            </Button>
          )}
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="h-4 w-4 mr-2" />
            Created {new Date(estate.createdAt?.seconds * 1000).toLocaleDateString()}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          onClick={onViewDashboard}
          className="flex-1"
          disabled={memberStatus === 'passive'}
        >
          View Dashboard
        </Button>
        {isAdmin && onCreateCharge && onAdminPanel && (
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={onCreateCharge}
              title="Create Service Charge"
            >
              <Building2 className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={onAdminPanel}
              title="Admin Panel"
            >
              <Users className="h-5 w-5" />
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}