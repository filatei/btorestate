import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Home, Users, Bell, MessageSquare, CreditCard, Check } from 'lucide-react';
import Chat from '../components/Chat';
import Notifications from '../components/Notifications';
import PaymentModal from '../components/PaymentModal';
import { format } from 'date-fns';

interface Estate {
  id: string;
  name: string;
  type: string;
  address: string;
}

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

const Dashboard = () => {
  const { currentUser } = useAuth();
  const [estates, setEstates] = useState<Estate[]>([]);
  const [serviceCharges, setServiceCharges] = useState<ServiceCharge[]>([]);
  const [paidCharges, setPaidCharges] = useState<ServiceCharge[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<number>(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCharge, setSelectedCharge] = useState<ServiceCharge | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const estatesQuery = query(
      collection(db, 'estates'),
      where('members', 'array-contains', currentUser.uid)
    );
    
    const unsubscribeEstates = onSnapshot(estatesQuery, (snapshot) => {
      const estateData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Estate[];
      setEstates(estateData);
      setIsLoading(false);
    });

    const presenceRef = collection(db, 'presence');
    const onlineUsersQuery = query(
      presenceRef,
      where('online', '==', true)
    );

    const unsubscribePresence = onSnapshot(onlineUsersQuery, (snapshot) => {
      setOnlineUsers(snapshot.size);
    });

    return () => {
      unsubscribeEstates();
      unsubscribePresence();
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || estates.length === 0) return;

    const estateIds = estates.map(estate => estate.id);

    const chargesQuery = query(
      collection(db, 'serviceCharges'),
      where('estateId', 'in', estateIds)
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
    };
  }, [currentUser, estates]);

  const handlePaymentClick = (charge: ServiceCharge) => {
    setSelectedCharge(charge);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setSelectedCharge(null);
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    try {
      const timestamp = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
      return format(timestamp, 'MMM d, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Estates Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Home className="h-6 w-6 text-indigo-600" />
            <h2 className="ml-2 text-xl font-semibold">My Estates</h2>
          </div>
          {estates.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No estates found</p>
          ) : (
            <div className="space-y-4">
              {estates.map(estate => (
                <div key={estate.id} className="p-4 border rounded-lg hover:border-indigo-500 transition-colors">
                  <h3 className="font-medium text-lg">{estate.name}</h3>
                  <p className="text-sm text-gray-500">{estate.address}</p>
                  <span className="inline-block mt-2 px-2 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
                    {estate.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payments Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <CreditCard className="h-6 w-6 text-indigo-600" />
            <h2 className="ml-2 text-xl font-semibold">Outstanding Payments</h2>
          </div>
          {serviceCharges.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No pending payments</p>
          ) : (
            <div className="space-y-4">
              {serviceCharges.map(charge => (
                <div key={charge.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-lg">{charge.title}</h3>
                      <p className="text-sm text-gray-500">{charge.description}</p>
                      <p className="text-sm text-gray-500">Due: {formatDate(charge.dueDate)}</p>
                      {charge.status === 'partial' && (
                        <p className="text-sm text-orange-600">
                          Paid: ₦{(charge.paidAmount || 0).toLocaleString()} / ₦{charge.amount.toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-indigo-600">
                        ₦{(charge.amount - (charge.paidAmount || 0)).toLocaleString()}
                      </p>
                      <button
                        onClick={() => handlePaymentClick(charge)}
                        className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 transition-colors"
                      >
                        {charge.status === 'partial' ? 'Complete Payment' : 'Pay Now'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Online Users & Chat Section */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Users className="h-6 w-6 text-indigo-600" />
                <h2 className="ml-2 text-xl font-semibold">Community</h2>
              </div>
              <div className="flex items-center">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="ml-2 text-sm text-gray-500">
                  {onlineUsers} online
                </span>
              </div>
            </div>
            <Chat />
          </div>
          
          <Notifications />
        </div>
      </div>

      {/* Paid Payments Table */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <Check className="h-6 w-6 text-green-600" />
          <h2 className="ml-2 text-xl font-semibold">Payment History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paidCharges.map(charge => (
                <tr key={charge.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{charge.title}</div>
                    <div className="text-sm text-gray-500">{charge.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">₦{charge.amount.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDate(charge.lastPaymentDate)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{charge.paymentMethod || 'N/A'}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {paidCharges.length === 0 && (
            <p className="text-gray-500 text-center py-4">No payment history</p>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedCharge && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          charge={{
            id: selectedCharge.id,
            amount: selectedCharge.amount,
            title: selectedCharge.title,
            estateId: selectedCharge.estateId,
            paidAmount: selectedCharge.paidAmount
          }}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default Dashboard;