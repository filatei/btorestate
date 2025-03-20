import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Bell, DollarSign, MessageSquare, Home, Check } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Notification {
  id: string;
  type: 'payment' | 'message' | 'estate';
  title: string;
  message: string;
  createdAt: any;
  read: boolean;
  userId: string;
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-semibold flex items-center">
          <Bell className="h-6 w-6 text-primary mr-2" />
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
              {unreadCount} new
            </span>
          )}
        </CardTitle>
        {unreadCount > 0 && (
          <Button
            onClick={markAllAsRead}
            variant="ghost"
            size="sm"
            className="text-primary hover:text-primary/80"
          >
            <Check className="h-4 w-4 mr-1" />
            Mark all as read
          </Button>
        )}
      </CardHeader>
      <CardContent>
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
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(notification.createdAt?.toDate(), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="h-2 w-2 bg-primary rounded-full"></div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}