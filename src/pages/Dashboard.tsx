import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useEstate } from '../contexts/EstateContext';
import { Home, Users, Bell, MessageSquare, CreditCard, Check } from 'lucide-react';
import Chat from '../components/Chat';
import Notifications from '../components/Notifications';
import PaymentModal from '../components/PaymentModal';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

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
  const { selectedEstate, isLoading: estateLoading } = useEstate();
  const navigate = useNavigate();
  const [serviceCharges, setServiceCharges] = useState<ServiceCharge[]>([]);
  const [paidCharges, setPaidCharges] = useState<ServiceCharge[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<number>(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCharge, setSelectedCharge] = useState<ServiceCharge | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser || !selectedEstate) {
      if (!estateLoading) {
        navigate('/estates');
      }
      return;
    }

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
      setIsLoading(false);
    });

    // Query online users for the selected estate
    const presenceQuery = query(
      collection(db, 'presence'),
      where('estateId', '==', selectedEstate.id),
      where('online', '==', true)
    );

    const unsubscribePresence = onSnapshot(presenceQuery, (snapshot) => {
      setOnlineUsers(snapshot.size);
    });

    return () => {
      unsubscribeCharges();
      unsubscribePresence();
    };
  }, [currentUser, selectedEstate, estateLoading, navigate]);

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
      return 'Invalid Date';
    }
  };

  if (isLoading || estateLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!selectedEstate) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">No Estate Selected</h2>
          <p className="text-gray-600 mb-4">Please select or create an estate to continue.</p>
          <button
            onClick={() => navigate('/estates')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Home className="h-5 w-5 mr-2" />
            Go to Estates
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Estate Info Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Home className="h-6 w-6 text-indigo-600" />
            <h2 className="ml-2 text-xl font-semibold">{selectedEstate.name}</h2>
          </div>
          <div className="space-y-2">
            <p className="text-gray-600">{selectedEstate.address}</p>
            <p className="text-sm text-gray-500">Type: {selectedEstate.type}</p>
            <p className="text-sm text-gray-500">Members: {selectedEstate.memberCount}</p>
            <p className="text-sm text-gray-500">
              Created: {formatDate(selectedEstate.createdAt)}
            </p>
          </div>
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

        {/* Community Section */}
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
            <Chat estateId={selectedEstate.id} />
          </div>
          
          <Notifications />
        </div>
      </div>

      {/* Payment History */}
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