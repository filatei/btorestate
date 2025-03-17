import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, LogOut, User, Home, Menu, X, Bell, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

const Navbar = () => {
  const { currentUser, signOut } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

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

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Building2 className="h-8 w-8 text-indigo-600" />
            <span className="ml-2 text-xl font-semibold text-gray-900">Torestate</span>
          </div>

          {currentUser && (
            <>
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-4">
                <Link
                  to="/dashboard"
                  className="flex items-center text-gray-700 hover:text-indigo-600"
                >
                  <Home className="h-5 w-5 mr-1" />
                  Dashboard
                </Link>
                <Link
                  to="/estates"
                  className="flex items-center text-gray-700 hover:text-indigo-600"
                >
                  <Building2 className="h-5 w-5 mr-1" />
                  Estates
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="flex items-center text-gray-700 hover:text-indigo-600"
                  >
                    <Shield className="h-5 w-5 mr-1" />
                    Admin
                  </Link>
                )}
                <Link
                  to="/notifications"
                  className="flex items-center text-gray-700 hover:text-indigo-600"
                >
                  <Bell className="h-5 w-5 mr-1" />
                  Notifications
                </Link>

                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center space-x-2 text-gray-700 hover:text-indigo-600"
                  >
                    <img
                      src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.displayName}`}
                      alt="Profile"
                      className="h-8 w-8 rounded-full"
                    />
                    <span className="hidden lg:block">{currentUser.displayName}</span>
                  </button>

                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
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

              {/* Mobile Navigation Button */}
              <div className="md:hidden flex items-center">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {isMenuOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Mobile Navigation Menu */}
        {isMenuOpen && currentUser && (
          <div className="md:hidden pb-3">
            <div className="space-y-1">
              <Link
                to="/dashboard"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50"
                onClick={() => setIsMenuOpen(false)}
              >
                <Home className="inline-block h-5 w-5 mr-2" />
                Dashboard
              </Link>
              <Link
                to="/estates"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50"
                onClick={() => setIsMenuOpen(false)}
              >
                <Building2 className="inline-block h-5 w-5 mr-2" />
                Estates
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Shield className="inline-block h-5 w-5 mr-2" />
                  Admin
                </Link>
              )}
              <Link
                to="/notifications"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50"
                onClick={() => setIsMenuOpen(false)}
              >
                <Bell className="inline-block h-5 w-5 mr-2" />
                Notifications
              </Link>
              <Link
                to="/profile"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50"
                onClick={() => setIsMenuOpen(false)}
              >
                <User className="inline-block h-5 w-5 mr-2" />
                Profile
              </Link>
              <button
                onClick={() => {
                  handleSignOut();
                  setIsMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50"
              >
                <LogOut className="inline-block h-5 w-5 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;