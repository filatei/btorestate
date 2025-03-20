import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserNav } from './UserNav';
import MobileNav from './MobileNav';
import { DesktopNav } from './DesktopNav';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button } from './ui/button';

const Navbar = () => {
  const { currentUser, signOut } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!currentUser) return;

      const adminQuery = query(
        collection(db, 'estates'),
        where('admins', 'array-contains', currentUser.uid)
      );
      const adminSnapshot = await getDocs(adminQuery);
      setIsAdmin(!adminSnapshot.empty);
    };

    checkAdminStatus();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      setUnreadNotifications(snapshot.size);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Failed to sign out:', error);
      toast.error('Failed to sign out');
    }
  };

  if (!currentUser) return null;

  return (
    <>
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-b z-50 px-4 py-2">
        <div className="flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="ml-2 text-lg font-semibold">Torestate</span>
          </Link>
          
          <div className="flex items-center space-x-4">
            <Link to="/notifications" className="relative">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive rounded-full flex items-center justify-center text-[10px] text-destructive-foreground">
                    {unreadNotifications}
                  </span>
                )}
              </Button>
            </Link>
            <UserNav user={currentUser} onLogout={handleSignOut} />
          </div>
        </div>
      </header>

      {/* Desktop Header */}
      <nav className="hidden md:block fixed top-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-b z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center">
                <Building2 className="h-8 w-8 text-primary" />
                <div className="ml-2">
                  <span className="text-xl font-semibold">Torestate</span>
                  <span className="ml-2 text-sm text-muted-foreground">Simplifying Estate Management</span>
                </div>
              </Link>
              <DesktopNav isAdmin={isAdmin} />
            </div>

            <div className="flex items-center space-x-4">
              <Link to="/notifications">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive rounded-full flex items-center justify-center text-[10px] text-destructive-foreground">
                      {unreadNotifications}
                    </span>
                  )}
                </Button>
              </Link>
              <UserNav user={currentUser} onLogout={handleSignOut} />
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <MobileNav isAdmin={isAdmin} />

      {/* Content Padding */}
      <div className="md:pt-16 pt-14 pb-16 md:pb-0" />
    </>
  );
};

export default Navbar;