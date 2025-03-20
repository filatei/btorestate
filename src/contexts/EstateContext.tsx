import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, or } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';

interface Estate {
  id: string;
  name: string;
  address: string;
  type: string;
  memberCount: number;
  members: string[];
  admins: string[];
  createdBy: string;
  createdAt: any;
}

interface EstateContextType {
  selectedEstate: Estate | null;
  availableEstates: Estate[];
  setSelectedEstate: (estate: Estate | null) => void;
  isLoading: boolean;
}

const EstateContext = createContext<EstateContextType | null>(null);

export const useEstate = () => {
  const context = useContext(EstateContext);
  if (!context) {
    throw new Error('useEstate must be used within an EstateProvider');
  }
  return context;
};

export const EstateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [selectedEstate, setSelectedEstate] = useState<Estate | null>(null);
  const [availableEstates, setAvailableEstates] = useState<Estate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setSelectedEstate(null);
      setAvailableEstates([]);
      setIsLoading(false);
      return;
    }

    // Query estates where user is a member, admin, or has been invited
    const estatesQuery = query(
      collection(db, 'estates'),
      or(
        where('members', 'array-contains', currentUser.uid),
        where('admins', 'array-contains', currentUser.uid),
        where('pendingRequests', 'array-contains', currentUser.uid)
      )
    );

    const unsubscribe = onSnapshot(estatesQuery, (snapshot) => {
      const estates = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Estate[];

      setAvailableEstates(estates);

      // Only set selected estate if:
      // 1. No estate is currently selected AND there are available estates
      // 2. Currently selected estate is no longer in available estates
      if ((!selectedEstate && estates.length > 0) || 
          (selectedEstate && !estates.find(e => e.id === selectedEstate.id))) {
        setSelectedEstate(estates[0] || null);
      }

      setIsLoading(false);
    }, (error) => {
      console.error('Error fetching estates:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, selectedEstate]);

  // Reset selected estate when user logs out
  useEffect(() => {
    if (!currentUser) {
      setSelectedEstate(null);
    }
  }, [currentUser]);

  return (
    <EstateContext.Provider value={{
      selectedEstate,
      availableEstates,
      setSelectedEstate,
      isLoading
    }}>
      {children}
    </EstateContext.Provider>
  );
};