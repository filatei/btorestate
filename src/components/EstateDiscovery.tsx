import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Search, Building2, Users, Clock, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

interface Estate {
  id: string;
  name: string;
  address: string;
  type: string;
  memberCount: number;
  createdAt: any;
  createdBy: string;
  admins: string[];
  pendingRequests?: string[];
}

interface EstateDiscoveryProps {
  userId: string;
  onRequestSent: () => void;
}

const ITEMS_PER_PAGE = 5;

export function EstateDiscovery({ userId, onRequestSent }: EstateDiscoveryProps) {
  const [estates, setEstates] = useState<Estate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEstateId, setSelectedEstateId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchEstates();
  }, []);

  useEffect(() => {
    // Reset to first page when search query changes
    setCurrentPage(1);
  }, [searchQuery]);

  const fetchEstates = async () => {
    try {
      const allEstatesSnapshot = await getDocs(collection(db, 'estates'));
      const allEstates = allEstatesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Estate[];

      // Filter out estates where user is already a member
      const availableEstates = allEstates.filter(estate => 
        !estate.members?.includes(userId)
      );

      setEstates(availableEstates);
      setTotalPages(Math.ceil(availableEstates.length / ITEMS_PER_PAGE));
    } catch (error) {
      console.error('Error fetching estates:', error);
      toast.error('Failed to load estates');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEstates = estates.filter(estate =>
    estate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    estate.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedEstates = filteredEstates.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleJoinRequest = async (estate: Estate) => {
    if (!userId) return;

    try {
      // Update estate with pending request
      const estateRef = doc(db, 'estates', estate.id);
      const pendingRequests = estate.pendingRequests || [];
      
      if (pendingRequests.includes(userId)) {
        toast.error('You have already requested to join this estate');
        return;
      }

      await updateDoc(estateRef, {
        pendingRequests: [...pendingRequests, userId]
      });

      setSelectedEstateId(estate.id);

      // Create notifications for estate admins
      const notifications = estate.admins.map(adminId => ({
        type: 'estate',
        title: 'New Join Request',
        message: `A user has requested to join ${estate.name}`,
        userId: adminId,
        estateId: estate.id,
        requesterId: userId,
        read: false,
        createdAt: serverTimestamp()
      }));

      await Promise.all(
        notifications.map(notification =>
          addDoc(collection(db, 'notifications'), notification)
        )
      );

      toast.success('Join request sent successfully');
      onRequestSent();
    } catch (error) {
      console.error('Error sending join request:', error);
      toast.error('Failed to send join request');
    }
  };

  const cancelJoinRequest = async (estate: Estate) => {
    try {
      const estateRef = doc(db, 'estates', estate.id);
      const pendingRequests = estate.pendingRequests?.filter(id => id !== userId) || [];
      
      await updateDoc(estateRef, { pendingRequests });
      
      setSelectedEstateId(null);
      toast.success('Join request cancelled');
      
      // Refresh estates list
      fetchEstates();
    } catch (error) {
      console.error('Error cancelling join request:', error);
      toast.error('Failed to cancel request');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          Discover Estates
        </CardTitle>
        <div className="flex gap-2 mt-4">
          <Input
            placeholder="Search estates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button variant="outline" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {paginatedEstates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No estates found
            </div>
          ) : (
            <>
              <div className="divide-y divide-border rounded-lg border bg-card overflow-hidden">
                {paginatedEstates.map(estate => {
                  const hasPendingRequest = estate.pendingRequests?.includes(userId);
                  const isSelected = selectedEstateId === estate.id;
                  
                  return (
                    <div
                      key={estate.id}
                      className="p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium">{estate.name}</h3>
                          <p className="text-sm text-muted-foreground">{estate.address}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center">
                              <Users className="h-4 w-4 mr-1" />
                              {estate.memberCount} members
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {new Date(estate.createdAt?.seconds * 1000).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        {hasPendingRequest || isSelected ? (
                          <Button
                            variant="outline"
                            onClick={() => cancelJoinRequest(estate)}
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel Request
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleJoinRequest(estate)}
                            disabled={selectedEstateId !== null}
                          >
                            Request to Join
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} of {Math.ceil(filteredEstates.length / ITEMS_PER_PAGE)}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredEstates.length / ITEMS_PER_PAGE), prev + 1))}
                    disabled={currentPage === Math.ceil(filteredEstates.length / ITEMS_PER_PAGE)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}