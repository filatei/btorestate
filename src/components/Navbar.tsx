import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Building2, LogOut, User, Home, Shield, Bell, CreditCard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

const Navbar = () => {
  const { currentUser, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const profileRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  if (!currentUser) return null;

  return (
    <>
      {/* Desktop Header */}
      <nav className="hidden md:block bg-white shadow-sm fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <Link to="/dashboard" className="flex items-center">
              <Building2 className="h-8 w-8 text-indigo-600" />
              <div className="ml-2">
                <span className="text-xl font-semibold text-gray-900">Torestate</span>
                <span className="ml-2 text-sm text-gray-500">Simplifying Estate Management</span>
              </div>
            </Link>

            <div className="flex items-center space-x-4">
              <Link
                to="/notifications"
                className="relative p-2 text-gray-600 hover:text-indigo-600"
              >
                <Bell className="h-6 w-6" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-0 right-0 -mt-1 -mr-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {unreadNotifications}
                  </span>
                )}
              </Link>

              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center"
                >
                  <img
                    src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.displayName}`}
                    alt="Profile"
                    className="h-8 w-8 rounded-full"
                  />
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                    <Link
                      to="/dashboard"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <Home className="inline-block h-4 w-4 mr-2" />
                      Dashboard
                    </Link>
                    <Link
                      to="/estates"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <Building2 className="inline-block h-4 w-4 mr-2" />
                      Estates
                    </Link>
                    <Link
                      to="/payments"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <CreditCard className="inline-block h-4 w-4 mr-2" />
                      Payments
                    </Link>
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <User className="inline-block h-4 w-4 mr-2" />
                      Profile
                    </Link>
                    <button
                      onClick={() => {
                        handleSignOut();
                        setIsProfileOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="inline-block h-4 w-4 mr-2" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50">
        <div className="flex flex-col items-center pt-2 pb-1 border-b border-gray-200">
          <span className="text-lg font-semibold text-gray-900">Torestate</span>
          <span className="text-xs text-gray-500 mb-1">Simplifying Estate Management</span>
        </div>
        <div className="grid grid-cols-5 h-16">
          <Link
            to="/dashboard"
            className={`flex flex-col items-center justify-center ${
              location.pathname === '/dashboard'
                ? 'text-indigo-600'
                : 'text-gray-500'
            }`}
          >
            <Home className="h-6 w-6" />
            <span className="text-xs mt-1">Home</span>
          </Link>
          
          <Link
            to="/estates"
            className={`flex flex-col items-center justify-center ${
              location.pathname === '/estates'
                ? 'text-indigo-600'
                : 'text-gray-500'
            }`}
          >
            <Building2 className="h-6 w-6" />
            <span className="text-xs mt-1">Estates</span>
          </Link>

          <Link
            to="/payments"
            className={`flex flex-col items-center justify-center ${
              location.pathname === '/payments'
                ? 'text-indigo-600'
                : 'text-gray-500'
            }`}
          >
            <CreditCard className="h-6 w-6" />
            <span className="text-xs mt-1">Payments</span>
          </Link>

          <Link
            to="/notifications"
            className={`flex flex-col items-center justify-center relative ${
              location.pathname === '/notifications'
                ? 'text-indigo-600'
                : 'text-gray-500'
            }`}
          >
            <Bell className="h-6 w-6" />
            {unreadNotifications > 0 && (
              <span className="absolute top-0 right-1/4 -mt-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {unreadNotifications}
              </span>
            )}
            <span className="text-xs mt-1">Alerts</span>
          </Link>

          <Link
            to="/profile"
            className={`flex flex-col items-center justify-center ${
              location.pathname === '/profile'
                ? 'text-indigo-600'
                : 'text-gray-500'
            }`}
          >
            <User className="h-6 w-6" />
            <span className="text-xs mt-1">Profile</span>
          </Link>
        </div>
      </nav>

      {/* Add padding to main content */}
      <div className="md:pt-16 pb-16 md:pb-0" />
    </>
  );
};

export default Navbar;