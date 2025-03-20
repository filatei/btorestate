import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot, updateDoc, doc, arrayUnion, arrayRemove, increment, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useEstate } from '../contexts/EstateContext';
import { Bell, DollarSign, MessageSquare, Home, Check, X, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ui/modal';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  type: 'payment' | 'message' | 'estate';
  title: string;
  message: string;
  createdAt: any;
  read: boolean;
  userId: string;
  estateId?: string;
  requesterId?: string;
  estateName?: string;
}

const NotificationIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'payment':
      return <DollarSign className="h-5 w-5 text-green-500" />;
    case 'message':
      return <MessageSquare className="h-5 w-5 text-blue-500" />;
    case 'estate':
      return <Home className="h-5 w-5 text-purple-500" />;
    default:
      return <Bell className="h-5 w-5 text-gray-500" />;
  }
};

export function Notifications() {
  const { currentUser } = useAuth();
  const { selectedEstate } = useEstate();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    show: boolean;
    notification: Notification | null;
    action: 'approve' | 'decline' | null;
  }>({
    show: false,
    notification: null,
    action: null
  });

  useEffect(() => {
    if (!currentUser) return;

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(notificationsQuery, async (snapshot) => {
      const newNotifications = await Promise.all(
        snapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data();
          // If it's a join request, fetch the estate name
          if (data.type === 'estate' && data.estateId && !data.estateName) {
            const estateRef = doc(db, 'estates', data.estateId);
            const estateDoc = await getDoc(estateRef);
            if (estateDoc.exists()) {
              return {
                id: docSnapshot.id,
                ...data,
                estateName: estateDoc.data()?.name
              };
            }
          }
          return {
            id: docSnapshot.id,
            ...data
          };
        })
      ) as Notification[];
      
      setNotifications(newNotifications);
      setUnreadCount(newNotifications.filter(n => !n.read).length);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const markAsRead = async (notification: Notification) => {
    if (notification.read) return;

    try {
      const notificationRef = doc(db, 'notifications', notification.id);
      await updateDoc(notificationRef, { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      await Promise.all(
        unreadNotifications.map(notification =>
          updateDoc(doc(db, 'notifications', notification.id), { read: true })
        )
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleJoinRequest = async (notification: Notification, approved: boolean) => {
    if (!notification.estateId || !notification.requesterId || isProcessing) return;

    setIsProcessing(notification.id);
    try {
      const estateRef = doc(db, 'estates', notification.estateId);
      const notificationRef = doc(db, 'notifications', notification.id);

      if (approved) {
        // Add user to members and remove from pending requests
        await updateDoc(estateRef, {
          members: arrayUnion(notification.requesterId),
          pendingRequests: arrayRemove(notification.requesterId),
          memberCount: increment(1)
        });

        // Create notification for requester
        await addDoc(collection(db, 'notifications'), {
          type: 'estate',
          title: 'Join Request Approved',
          message: `Your request to join ${notification.estateName || 'the estate'} has been approved`,
          userId: notification.requesterId,
          estateId: notification.estateId,
          read: false,
          createdAt: serverTimestamp()
        });

        toast.success('Join request approved');
      } else {
        // Remove user from pending requests
        await updateDoc(estateRef, {
          pendingRequests: arrayRemove(notification.requesterId)
        });

        // Create notification for requester
        await addDoc(collection(db, 'notifications'), {
          type: 'estate',
          title: 'Join Request Declined',
          message: `Your request to join ${notification.estateName || 'the estate'} has been declined`,
          userId: notification.requesterId,
          estateId: notification.estateId,
          read: false,
          createdAt: serverTimestamp()
        });

        toast.success('Join request declined');
      }

      // Mark the admin's notification as read
      await updateDoc(notificationRef, { read: true });
    } catch (error) {
      console.error('Error handling join request:', error);
      toast.error('Failed to process join request');
    } finally {
      setIsProcessing(null);
      setConfirmAction({ show: false, notification: null, action: null });
    }
  };

  return (
    <div className="bg-card rounded-lg shadow">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Bell className="h-6 w-6 text-primary" />
            <h2 className="ml-2 text-xl font-semibold">Notifications</h2>
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-1 bg-destructive/10 text-destructive text-xs font-medium rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-primary hover:text-primary/80"
            >
              <Check className="h-4 w-4 mr-1" />
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      <div className="divide-y divide-border">
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => markAsRead(notification)}
              className={`p-4 ${notification.read ? 'bg-background' : 'bg-accent'} cursor-pointer hover:bg-accent/50 transition-colors duration-150`}
            >
              <div className="flex items-start space-x-3">
                <NotificationIcon type={notification.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {notification.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {notification.message}
                  </p>
                  {notification.type === 'estate' && notification.estateName && (
                    <p className="text-sm font-medium text-primary mt-1">
                      Estate: {notification.estateName}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(notification.createdAt?.toDate(), 'MMM d, yyyy h:mm a')}
                  </p>

                  {/* Join Request Actions */}
                  {notification.type === 'estate' && notification.requesterId && !notification.read && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmAction({
                            show: true,
                            notification,
                            action: 'approve'
                          });
                        }}
                        disabled={isProcessing === notification.id}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmAction({
                            show: true,
                            notification,
                            action: 'decline'
                          });
                        }}
                        disabled={isProcessing === notification.id}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Decline
                      </Button>
                    </div>
                  )}
                </div>
                {!notification.read && (
                  <div className="h-2 w-2 bg-primary rounded-full"></div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        open={confirmAction.show}
        onOpenChange={(open) => setConfirmAction(prev => ({ ...prev, show: open }))}
        title={`Confirm ${confirmAction.action === 'approve' ? 'Approval' : 'Decline'}`}
        description={`Are you sure you want to ${confirmAction.action === 'approve' ? 'approve' : 'decline'} this join request${
          confirmAction.notification?.estateName ? ` for ${confirmAction.notification.estateName}` : ''
        }?`}
        onConfirm={() => {
          if (confirmAction.notification && confirmAction.action) {
            handleJoinRequest(
              confirmAction.notification,
              confirmAction.action === 'approve'
            );
          }
        }}
        confirmText={confirmAction.action === 'approve' ? 'Approve' : 'Decline'}
        variant={confirmAction.action === 'approve' ? 'default' : 'destructive'}
      />
    </div>
  );
}