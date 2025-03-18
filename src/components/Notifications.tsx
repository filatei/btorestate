import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Bell, DollarSign, MessageSquare, Home, Check, Users } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

interface Notification {
  id: string;
  type: 'payment' | 'message' | 'estate';
  title: string;
  message: string;
  createdAt: any;
  read: boolean;
  userId: string;
  actionType?: string;
  estateId?: string;
  inviteToken?: string;
}

const NotificationIcon = ({ type, actionType }: { type: string; actionType?: string }) => {
  if (actionType === 'invitation') {
    return <Users className="h-5 w-5 text-indigo-500" />;
  }
  
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

const Notifications = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!currentUser) return;

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const newNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      
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

  const handleInviteResponse = async (notification: any, accept: boolean) => {
    if (!notification.estateId || !notification.inviteToken) return;

    try {
      const estateRef = doc(db, 'estates', notification.estateId);
      const estateDoc = await getDoc(estateRef);
      
      if (!estateDoc.exists()) {
        toast.error('Estate not found');
        return;
      }

      const estateData = estateDoc.data();
      const inviteTokens = estateData.inviteTokens || {};
      
      if (inviteTokens[currentUser?.uid]?.token !== notification.inviteToken) {
        toast.error('Invalid invitation token');
        return;
      }

      if (accept) {
        await updateDoc(estateRef, {
          members: [...estateData.members, currentUser?.uid],
          memberCount: estateData.memberCount + 1,
          invitedUsers: estateData.invitedUsers.filter((id: string) => id !== currentUser?.uid),
          [`inviteTokens.${currentUser?.uid}`]: null
        });
        toast.success('Successfully joined the estate');
      } else {
        await updateDoc(estateRef, {
          invitedUsers: estateData.invitedUsers.filter((id: string) => id !== currentUser?.uid),
          [`inviteTokens.${currentUser?.uid}`]: null
        });
        toast.success('Invitation declined');
      }

      // Mark notification as read
      const notificationRef = doc(db, 'notifications', notification.id);
      await updateDoc(notificationRef, { read: true });
    } catch (error) {
      console.error('Error handling invitation:', error);
      toast.error('Failed to process invitation');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
            >
              <Check className="h-4 w-4 mr-1" />
              Mark all as read
            </button>
          )}
        </div>
      </div>
      <div className="divide-y divide-gray-200">
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No notifications yet
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => markAsRead(notification)}
              className={`p-4 ${notification.read ? 'bg-white' : 'bg-indigo-50'} cursor-pointer hover:bg-gray-50 transition-colors duration-150`}
            >
              <div className="flex items-start space-x-3">
                <NotificationIcon type={notification.type} actionType={notification.actionType} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {notification.title}
                  </p>
                  <p className="text-sm text-gray-500">
                    {notification.message}
                  </p>
                  {notification.actionType === 'invitation' && !notification.read && (
                    <div className="mt-2 flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInviteResponse(notification, true);
                        }}
                        className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
                      >
                        Accept
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInviteResponse(notification, false);
                        }}
                        className="px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {format(notification.createdAt?.toDate(), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                {!notification.read && (
                  <div className="h-2 w-2 bg-indigo-600 rounded-full"></div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;