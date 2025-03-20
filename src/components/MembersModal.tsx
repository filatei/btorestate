import React from 'react';
import { Modal } from '@/components/ui/modal';
import { Shield, ShieldOff, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';

interface Member {
  id: string;
  displayName: string;
  email: string;
  photoURL: string;
  isAdmin: boolean;
  status: 'active' | 'passive';
}

interface MembersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  onToggleAdmin?: (memberId: string) => void;
  onUpdateStatus?: (memberId: string, status: 'active' | 'passive') => void;
  currentUserId?: string;
  isCreator?: boolean;
}

export function MembersModal({
  open,
  onOpenChange,
  members,
  onToggleAdmin,
  onUpdateStatus,
  currentUserId,
  isCreator
}: MembersModalProps) {
  const handleStatusChange = async (memberId: string, status: 'active' | 'passive') => {
    if (onUpdateStatus) {
      try {
        await onUpdateStatus(memberId, status);
        toast.success(`Member status updated to ${status}`);
      } catch (error) {
        toast.error('Failed to update member status');
      }
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Estate Members"
    >
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Member</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {members.map(member => (
              <tr key={member.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={member.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.displayName)}`}
                        alt={member.displayName}
                      />
                      <AvatarFallback>{member.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="ml-3">
                      <div className="text-sm font-medium">
                        {member.displayName}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-muted-foreground">{member.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge variant={member.isAdmin ? 'default' : 'secondary'}>
                    {member.isAdmin ? 'Admin' : 'Member'}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge variant={member.status === 'active' ? 'success' : 'warning'}>
                    {member.status}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex gap-2">
                    {isCreator && onToggleAdmin && member.id !== currentUserId && (
                      <Button
                        onClick={() => onToggleAdmin(member.id)}
                        variant={member.isAdmin ? 'destructive' : 'default'}
                        size="sm"
                      >
                        {member.isAdmin ? (
                          <>
                            <ShieldOff className="h-4 w-4 mr-1" />
                            Remove Admin
                          </>
                        ) : (
                          <>
                            <Shield className="h-4 w-4 mr-1" />
                            Make Admin
                          </>
                        )}
                      </Button>
                    )}
                    {member.id === currentUserId && member.status === 'active' && (
                      <Button
                        onClick={() => handleStatusChange(member.id, 'passive')}
                        variant="outline"
                        size="sm"
                      >
                        <LogOut className="h-4 w-4 mr-1" />
                        Leave Estate
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}