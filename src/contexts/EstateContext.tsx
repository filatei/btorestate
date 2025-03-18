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

    // Query estates where user is a member or has been invited
    const estatesQuery = query(
      collection(db, 'estates'),
      or(
        where('members', 'array-contains', currentUser.uid),
        where('invitedUsers', 'array-contains', currentUser.uid)
      )
    );

    const unsubscribe = onSnapshot(estatesQuery, (snapshot) => {
      const estates = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Estate[];

      setAvailableEstates(estates);

      // If no estate is selected and there are available estates, select the first one
      if (!selectedEstate && estates.length > 0) {
        setSelectedEstate(estates[0]);
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

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