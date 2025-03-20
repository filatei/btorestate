import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, addDoc, serverTimestamp, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Send, Loader2, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userPhotoURL: string;
  createdAt: any;
  isNotification?: boolean;
}

interface ChatProps {
  estateId: string;
}

export function Chat({ estateId }: ChatProps) {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isNotification, setIsNotification] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!estateId) return;

    const messagesQuery = query(
      collection(db, `estates/${estateId}/messages`),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const newMessages = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Message))
        .reverse();
      setMessages(newMessages);
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [estateId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !estateId || isLoading) return;

    setIsLoading(true);
    try {
      // Add message to chat
      const messageData = {
        text: newMessage.trim(),
        userId: currentUser.uid,
        userName: currentUser.displayName,
        userPhotoURL: currentUser.photoURL,
        createdAt: serverTimestamp(),
        isNotification
      };

      await addDoc(collection(db, `estates/${estateId}/messages`), messageData);

      // If it's a notification, create notifications for all estate members
      if (isNotification) {
        const estateRef = doc(db, 'estates', estateId);
        const estateDoc = await getDoc(estateRef);
        const estateData = estateDoc.data();
        
        if (estateData && estateData.members) {
          // Create notifications for all members except sender
          const notifications = estateData.members
            .filter((memberId: string) => memberId !== currentUser.uid)
            .map((memberId: string) => ({
              userId: memberId,
              type: 'message',
              title: 'New Estate Notification',
              message: `${currentUser.displayName}: ${newMessage.trim()}`,
              estateId,
              read: false,
              createdAt: serverTimestamp()
            }));

          // Add all notifications
          await Promise.all(
            notifications.map(notification =>
              addDoc(collection(db, 'notifications'), notification)
            )
          );
        }
      }

      setNewMessage('');
      setIsNotification(false);
      toast.success(isNotification ? 'Notification sent to all members' : 'Message sent');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] bg-card rounded-lg shadow">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start space-x-2 ${
              message.userId === currentUser?.uid ? 'flex-row-reverse space-x-reverse' : ''
            }`}
          >
            <img
              src={message.userPhotoURL || `https://ui-avatars.com/api/?name=${message.userName}`}
              alt={message.userName}
              className="w-8 h-8 rounded-full"
            />
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.isNotification
                  ? 'bg-yellow-100 text-yellow-900'
                  : message.userId === currentUser?.uid
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              }`}
            >
              <div className="flex items-center gap-1 mb-1">
                <span className="text-sm font-medium">{message.userName}</span>
                {message.isNotification && (
                  <Bell className="h-4 w-4" />
                )}
              </div>
              <p className="text-sm">{message.text}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t border-border md:pb-4 pb-20">
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => setIsNotification(!isNotification)}
              variant={isNotification ? 'default' : 'outline'}
              size="icon"
              title={isNotification ? 'Send as normal message' : 'Send as notification'}
            >
              <Bell className="h-5 w-5" />
            </Button>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={isNotification ? "Send notification to all members..." : "Type a message..."}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={isLoading || !newMessage.trim()}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          {isNotification && (
            <p className="text-xs text-yellow-600">
              This message will be sent as a notification to all estate members
            </p>
          )}
        </div>
      </form>
    </div>
  );
}