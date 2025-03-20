import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, doc, updateDoc, where, deleteDoc, arrayUnion, arrayRemove, increment, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Users, CreditCard, Check, X, Trash2, Edit, Loader2, UserPlus, Bell, Building2, Plus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Modal, ConfirmModal } from '@/components/ui/modal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

interface Payment {
  id: string;
  userId: string;
  estateId: string;
  title: string;
  amount: number;
  status: 'paid' | 'pending';
  dueDate: any;
  description: string;
  userEmail?: string;
  userName?: string;
}

interface JoinRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhoto?: string;
  createdAt: any;
  estateName?: string;
}

const Admin = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [selectedEstateId, setSelectedEstateId] = useState<string | null>(null);
  const [availableEstates, setAvailableEstates] = useState<Array<{ id: string; name: string }>>([]);
  const [confirmAction, setConfirmAction] = useState<{
    show: boolean;
    type: 'approve' | 'decline' | 'delete';
    data: any;
    estateName?: string;
  } | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!currentUser) {
        navigate('/');
        return;
      }

      const adminQuery = query(
        collection(db, 'estates'),
        where('admins', 'array-contains', currentUser.uid)
      );
      const adminSnapshot = await getDocs(adminQuery);

      if (adminSnapshot.empty) {
        toast.error('Access denied');
        navigate('/dashboard');
        return;
      }

      const estates = adminSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      }));
      setAvailableEstates(estates);

      if (estates.length > 0) {
        setSelectedEstateId(estates[0].id);
      }
    };

    checkAdminStatus();
  }, [currentUser, navigate]);

  useEffect(() => {
    if (!selectedEstateId) return;
    fetchData();
  }, [selectedEstateId]);

  const fetchData = async () => {
    if (!selectedEstateId) return;

    try {
      setIsLoading(true);
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
      setUsers(usersData);

      const paymentsSnapshot = await getDocs(
        query(collection(db, 'serviceCharges'), where('estateId', '==', selectedEstateId))
      );
      const paymentsData = paymentsSnapshot.docs.map(doc => {
        const data = doc.data();
        const user = usersData.find(u => u.id === data.userId);
        return {
          id: doc.id,
          ...data,
          userEmail: user?.email,
          userName: user?.displayName
        };
      }) as Payment[];

      setPayments(paymentsData);

      const estateDoc = await getDoc(doc(db, 'estates', selectedEstateId));
      const estateData = estateDoc.data();
      const pendingRequests = estateData?.pendingRequests || [];
      
      const requestsData = await Promise.all(
        pendingRequests.map(async (userId: string) => {
          const userDoc = await getDoc(doc(db, 'users', userId));
          const userData = userDoc.data();
          return {
            id: userId,
            userId,
            userName: userData?.displayName || 'Unknown User',
            userEmail: userData?.email || '',
            userPhoto: userData?.photoURL,
            createdAt: userData?.createdAt,
            estateName: estateData?.name
          };
        })
      );

      setJoinRequests(requestsData);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
      setIsLoading(false);
    }
  };

  const handleJoinRequest = async (request: JoinRequest, approved: boolean) => {
    if (!selectedEstateId || isProcessing) return;

    setIsProcessing(true);
    try {
      const estateRef = doc(db, 'estates', selectedEstateId);
      
      if (approved) {
        await updateDoc(estateRef, {
          members: arrayUnion(request.userId),
          pendingRequests: arrayRemove(request.userId),
          memberCount: increment(1)
        });

        await addDoc(collection(db, 'notifications'), {
          type: 'estate',
          title: 'Join Request Approved',
          message: `Your request to join ${request.estateName || 'the estate'} has been approved`,
          userId: request.userId,
          estateId: selectedEstateId,
          read: false,
          createdAt: serverTimestamp()
        });

        toast.success('User approved successfully');
      } else {
        await updateDoc(estateRef, {
          pendingRequests: arrayRemove(request.userId)
        });

        await addDoc(collection(db, 'notifications'), {
          type: 'estate',
          title: 'Join Request Declined',
          message: `Your request to join ${request.estateName || 'the estate'} has been declined`,
          userId: request.userId,
          estateId: selectedEstateId,
          read: false,
          createdAt: serverTimestamp()
        });

        toast.success('Request declined');
      }

      fetchData();
    } catch (error) {
      console.error('Error handling join request:', error);
      toast.error('Failed to process request');
    } finally {
      setIsProcessing(false);
      setConfirmAction(null);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      await deleteDoc(doc(db, 'serviceCharges', paymentId));
      toast.success('Payment deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error('Failed to delete payment');
    } finally {
      setConfirmAction(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Building2 className="h-8 w-8 text-primary" />
          <Select
            value={selectedEstateId || ''}
            onValueChange={(value) => setSelectedEstateId(value)}
          >
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select an estate" />
            </SelectTrigger>
            <SelectContent>
              {availableEstates.map((estate) => (
                <SelectItem key={estate.id} value={estate.id}>
                  {estate.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="requests" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="requests">
              <Bell className="h-4 w-4 mr-2" />
              Join Requests
            </TabsTrigger>
            <TabsTrigger value="payments">
              <CreditCard className="h-4 w-4 mr-2" />
              Payments
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Pending Join Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {joinRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pending join requests
                </div>
              ) : (
                <div className="space-y-4">
                  {joinRequests.map(request => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-4">
                        <img
                          src={request.userPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(request.userName)}`}
                          alt={request.userName}
                          className="h-10 w-10 rounded-full"
                        />
                        <div>
                          <h3 className="font-medium">{request.userName}</h3>
                          <p className="text-sm text-muted-foreground">{request.userEmail}</p>
                          {request.estateName && (
                            <p className="text-sm font-medium text-primary">
                              Estate: {request.estateName}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setConfirmAction({
                            show: true,
                            type: 'approve',
                            data: request,
                            estateName: request.estateName
                          })}
                          disabled={isProcessing}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setConfirmAction({
                            show: true,
                            type: 'decline',
                            data: request,
                            estateName: request.estateName
                          })}
                          disabled={isProcessing}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Due Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payments.map(payment => (
                      <tr key={payment.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium">
                              {payment.userName || 'Unknown'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {payment.userEmail}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">{payment.title}</div>
                          <div className="text-xs text-muted-foreground">{payment.description}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            ₦{payment.amount.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            {new Date(payment.dueDate?.seconds * 1000).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={payment.status === 'paid' ? 'success' : 'warning'}>
                            {payment.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingPayment(payment);
                                setShowEditModal(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setConfirmAction({
                                show: true,
                                type: 'delete',
                                data: payment.id
                              })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirmation Modal */}
      <ConfirmModal
        open={confirmAction?.show || false}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={
          confirmAction?.type === 'delete'
            ? 'Confirm Delete'
            : `Confirm ${confirmAction?.type === 'approve' ? 'Approval' : 'Decline'}`
        }
        description={
          confirmAction?.type === 'delete'
            ? 'Are you sure you want to delete this payment? This action cannot be undone.'
            : `Are you sure you want to ${confirmAction?.type === 'approve' ? 'approve' : 'decline'} this join request${
                confirmAction?.estateName ? ` for ${confirmAction.estateName}` : ''
              }?`
        }
        onConfirm={() => {
          if (!confirmAction) return;
          
          if (confirmAction.type === 'delete') {
            handleDeletePayment(confirmAction.data);
          } else {
            handleJoinRequest(
              confirmAction.data,
              confirmAction.type === 'approve'
            );
          }
        }}
        confirmText={
          confirmAction?.type === 'delete'
            ? 'Delete'
            : confirmAction?.type === 'approve'
            ? 'Approve'
            : 'Decline'
        }
        variant={confirmAction?.type === 'delete' ? 'destructive' : confirmAction?.type === 'approve' ? 'default' : 'destructive'}
      />
    </div>
  );
};

export default Admin;