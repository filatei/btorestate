import React from 'react';
import { Modal } from '@/components/ui/modal';
import { Shield, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface Member {
  id: string;
  displayName: string;
  email: string;
  photoURL: string;
  isAdmin: boolean;
}

interface MembersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  onToggleAdmin?: (memberId: string) => void;
  currentUserId?: string;
  isCreator?: boolean;
}

export function MembersModal({
  open,
  onOpenChange,
  members,
  onToggleAdmin,
  currentUserId,
  isCreator
}: MembersModalProps) {
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
              {isCreator && <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>}
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
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    member.isAdmin
                      ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100'
                      : 'bg-secondary text-secondary-foreground'
                  }`}>
                    {member.isAdmin ? 'Admin' : 'Member'}
                  </span>
                </td>
                {isCreator && onToggleAdmin && member.id !== currentUserId && (
                  <td className="px-6 py-4 whitespace-nowrap">
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
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}