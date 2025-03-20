import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, initializePresence, getOnlineUsersCount } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useEstate } from '../contexts/EstateContext';
import { Home, Users, Bell, MessageSquare, CreditCard, Check, UserPlus, X, Mail } from 'lucide-react';
import { Chat } from '@/components/Chat';
import { Notifications } from '@/components/Notifications';
import { OutstandingPayments } from '@/components/OutstandingPayments';
import { format, isValid } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MembersModal } from '@/components/MembersModal';

interface ServiceCharge {
  id: string;
  estateId: string;
  title: string;
  amount: number;
  paidAmount?: number;
  dueDate: any;
  description: string;
  status: 'paid' | 'pending' | 'partial';
  lastPaymentDate?: any;
  paymentHistory?: Array<{
    amount: number;
    date: any;
    userId: string;
    method: string;
  }>;
}

interface Member {
  id: string;
  displayName: string;
  email: string;
  photoURL: string;
  isAdmin: boolean;
}

export default function Dashboard() {
  const { currentUser } = useAuth();
  const { selectedEstate, isLoading: estateLoading } = useEstate();
  const navigate = useNavigate();
  const [serviceCharges, setServiceCharges] = useState<ServiceCharge[]>([]);
  const [paidCharges, setPaidCharges] = useState<ServiceCharge[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<number>(0);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (!currentUser || !selectedEstate) {
      if (!estateLoading) {
        navigate('/estates');
      }
      return;
    }

    // Initialize presence system
    initializePresence(currentUser.uid, selectedEstate.id);

    // Get online users count
    const unsubscribePresence = getOnlineUsersCount(selectedEstate.id, (count) => {
      setOnlineUsers(count);
    });

    // Query service charges for the selected estate
    const chargesQuery = query(
      collection(db, 'serviceCharges'),
      where('estateId', '==', selectedEstate.id)
    );

    const unsubscribeCharges = onSnapshot(chargesQuery, (snapshot) => {
      const allCharges = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ServiceCharge[];

      const pending = allCharges.filter(charge => 
        charge.status === 'pending' || charge.status === 'partial'
      );
      const paid = allCharges.filter(charge => 
        charge.status === 'paid'
      );

      setServiceCharges(pending);
      setPaidCharges(paid);
    });

    return () => {
      unsubscribeCharges();
      if (unsubscribePresence) unsubscribePresence();
    };
  }, [currentUser, selectedEstate, estateLoading, navigate]);

  const handleViewMembers = async () => {
    if (!selectedEstate || !selectedEstate.members || !selectedEstate.admins) return;

    try {
      const memberPromises = selectedEstate.members.map(async (userId) => {
        const userDoc = await getDoc(doc(db, 'users', userId));
        const userData = userDoc.data();
        return {
          id: userId,
          displayName: userData?.displayName || 'Unknown User',
          email: userData?.email || '',
          photoURL: userData?.photoURL || '',
          isAdmin: selectedEstate.admins.includes(userId)
        };
      });

      const memberData = await Promise.all(memberPromises);
      setMembers(memberData);
      setShowMembersModal(true);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load members');
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEstate || !currentUser || isInviting) return;

    // Check if user is an admin
    if (!selectedEstate.admins?.includes(currentUser.uid)) {
      toast.error('Only admins can invite members');
      return;
    }

    setIsInviting(true);
    try {
      // Generate a unique invite token
      const inviteToken = Math.random().toString(36).substring(2);

      // Create notification for the invited user
      await addDoc(collection(db, 'notifications'), {
        type: 'estate',
        actionType: 'invitation',
        title: 'Estate Invitation',
        message: `You have been invited to join ${selectedEstate.name}`,
        inviteToken,
        estateId: selectedEstate.id,
        userId: inviteEmail,
        read: false,
        createdAt: serverTimestamp()
      });

      setInviteEmail('');
      setShowInviteModal(false);
      toast.success('Invitation sent successfully');
    } catch (error) {
      console.error('Error inviting member:', error);
      toast.error('Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    try {
      const timestamp = date.toDate ? date.toDate() : new Date(date);
      return isValid(timestamp) ? format(timestamp, 'MMM d, yyyy') : 'Invalid Date';
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid Date';
    }
  };

  const PaymentHistory = ({ payments }: { payments: ServiceCharge[] }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Check className="h-6 w-6 text-green-600 mr-2" />
          Payment History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Method</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {payments.map(payment => (
                <tr key={payment.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium">{payment.title}</div>
                    <div className="text-sm text-muted-foreground">{payment.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">₦{payment.amount.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">{formatDate(payment.lastPaymentDate)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">{payment.paymentMethod || 'N/A'}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {payments.length === 0 && (
            <p className="text-center text-muted-foreground py-4">No payment history</p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (!selectedEstate) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">No Estate Selected</h2>
          <p className="text-gray-600 mb-4">Please select or create an estate to continue.</p>
          <Button
            onClick={() => navigate('/estates')}
            className="inline-flex items-center"
          >
            <Home className="h-5 w-5 mr-2" />
            Go to Estates
          </Button>
        </div>
      </div>
    );
  }

  const isAdmin = selectedEstate.admins?.includes(currentUser?.uid || '') || false;

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      {/* Estate Info Card - Always visible */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Home className="h-6 w-6 text-primary mr-2" />
              <div>
                <CardTitle className="text-xl">{selectedEstate.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{selectedEstate.address}</p>
              </div>
            </div>
            {isAdmin && (
              <Button
                onClick={() => setShowInviteModal(true)}
                variant="ghost"
                size="icon"
                title="Invite Members"
              >
                <UserPlus className="h-5 w-5" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm">
            <Button
              onClick={handleViewMembers}
              variant="link"
              className="h-auto p-0"
            >
              <Users className="h-4 w-4 mr-2" />
              {selectedEstate.memberCount} {selectedEstate.memberCount === 1 ? 'member' : 'members'}
            </Button>
            <div className="flex items-center text-muted-foreground">
              <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
              {onlineUsers} online
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Tabs */}
      <Tabs defaultValue="payments" className="md:hidden">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="notifications">
            <span className="relative">
              Notifications
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white">
                  {unreadNotifications}
                </span>
              )}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-4">
          <OutstandingPayments payments={serviceCharges} />
          <div className="mt-8">
            <PaymentHistory payments={paidCharges} />
          </div>
        </TabsContent>

        <TabsContent value="chat">
          <Card>
            <CardContent className="p-0">
              <Chat estateId={selectedEstate.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Notifications />
        </TabsContent>
      </Tabs>

      {/* Desktop Layout */}
      <div className="hidden md:grid md:grid-cols-3 gap-6">
        <OutstandingPayments payments={serviceCharges} />
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Users className="h-6 w-6 text-primary mr-2" />
                  Community
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Chat estateId={selectedEstate.id} />
            </CardContent>
          </Card>
          <Notifications />
        </div>
        <PaymentHistory payments={paidCharges} />
      </div>

      {/* Members Modal */}
      <MembersModal
        open={showMembersModal}
        onOpenChange={setShowMembersModal}
        members={members}
      />

      {/* Invite Modal */}
      <Modal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        title="Invite Member"
      >
        <form onSubmit={handleInviteMember}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Enter email address"
                required
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowInviteModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isInviting || !inviteEmail}
                className="flex items-center"
              >
                {isInviting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}