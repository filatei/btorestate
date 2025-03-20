import React, { useState } from 'react';
import { Settings as SettingsIcon, Moon, Sun, Monitor, Search, Shield, Key } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

interface Estate {
  id: string;
  name: string;
  address: string;
  memberCount: number;
}

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Estate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const estatesRef = collection(db, 'estates');
      const q = query(
        estatesRef,
        where('name', '>=', searchQuery),
        where('name', '<=', searchQuery + '\uf8ff')
      );
      
      const snapshot = await getDocs(q);
      const estates = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Estate[];

      setSearchResults(estates);
    } catch (error) {
      console.error('Error searching estates:', error);
      toast.error('Failed to search estates');
    } finally {
      setIsSearching(false);
    }
  };

  const toggle2FA = () => {
    setIs2FAEnabled(!is2FAEnabled);
    toast.success(`2FA ${!is2FAEnabled ? 'enabled' : 'disabled'}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center mb-6">
          <SettingsIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          <h1 className="ml-2 text-2xl font-semibold text-gray-900 dark:text-white">Settings</h1>
        </div>

        {/* Theme Settings */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Theme</h2>
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => setTheme('light')}
              className={`p-4 rounded-lg flex flex-col items-center ${
                theme === 'light' ? 'bg-indigo-100 dark:bg-indigo-900' : 'bg-gray-100 dark:bg-gray-700'
              }`}
            >
              <Sun className="h-6 w-6 mb-2 text-yellow-500" />
              <span className="text-sm font-medium dark:text-white">Light</span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-lg flex flex-col items-center ${
                theme === 'dark' ? 'bg-indigo-100 dark:bg-indigo-900' : 'bg-gray-100 dark:bg-gray-700'
              }`}
            >
              <Moon className="h-6 w-6 mb-2 text-blue-500" />
              <span className="text-sm font-medium dark:text-white">Dark</span>
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`p-4 rounded-lg flex flex-col items-center ${
                theme === 'system' ? 'bg-indigo-100 dark:bg-indigo-900' : 'bg-gray-100 dark:bg-gray-700'
              }`}
            >
              <Monitor className="h-6 w-6 mb-2 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium dark:text-white">System</span>
            </button>
          </div>
        </div>

        {/* Estate Search */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Find Estates</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search estates..."
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
          
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {searchResults.map(estate => (
                <div
                  key={estate.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <h3 className="font-medium text-gray-900 dark:text-white">{estate.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{estate.address}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {estate.memberCount} members
                  </p>
                  <button className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700">
                    Request to Join
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security Settings */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Security</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center">
                <Shield className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-2" />
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Add an extra layer of security</p>
                </div>
              </div>
              <button
                onClick={toggle2FA}
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                  is2FAEnabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    is2FAEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center">
                <Key className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-2" />
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Change Password</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Update your password</p>
                </div>
              </div>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700">
                Update
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;