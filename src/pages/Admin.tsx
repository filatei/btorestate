import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, doc, updateDoc, where, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Users, CreditCard, Check, X, Trash2, Edit, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  displayName: string;
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

const Admin = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!currentUser) {
        navigate('/');
        return;
      }

      // Check if user is admin
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

      fetchData();
    };

    checkAdminStatus();
  }, [currentUser, navigate]);

  const fetchData = async () => {
    try {
      // Fetch all users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
      setUsers(usersData);

      // Fetch all payments
      const paymentsSnapshot = await getDocs(collection(db, 'serviceCharges'));
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
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    }
  };

  const togglePaymentStatus = async (payment: Payment) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      const paymentRef = doc(db, 'serviceCharges', payment.id);
      const newStatus = payment.status === 'paid' ? 'pending' : 'paid';
      
      await updateDoc(paymentRef, {
        status: newStatus,
        updatedAt: new Date(),
        updatedBy: currentUser?.uid
      });

      setPayments(prev =>
        prev.map(p =>
          p.id === payment.id ? { ...p, status: newStatus } : p
        )
      );

      toast.success(`Payment marked as ${newStatus}`);
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Failed to update payment status');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeletePayment = async (payment: Payment) => {
    if (!window.confirm('Are you sure you want to delete this service charge?')) {
      return;
    }

    setIsProcessing(true);
    try {
      await deleteDoc(doc(db, 'serviceCharges', payment.id));
      setPayments(prev => prev.filter(p => p.id !== payment.id));
      toast.success('Service charge deleted successfully');
    } catch (error) {
      console.error('Error deleting service charge:', error);
      toast.error('Failed to delete service charge');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditPayment = async (payment: Payment) => {
    setEditingPayment(payment);
    setShowEditModal(true);
  };

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment || isProcessing) return;

    setIsProcessing(true);
    try {
      const paymentRef = doc(db, 'serviceCharges', editingPayment.id);
      await updateDoc(paymentRef, {
        title: editingPayment.title,
        amount: editingPayment.amount,
        description: editingPayment.description,
        dueDate: editingPayment.dueDate,
        updatedAt: new Date(),
        updatedBy: currentUser?.uid
      });

      setPayments(prev =>
        prev.map(p =>
          p.id === editingPayment.id ? editingPayment : p
        )
      );

      setShowEditModal(false);
      setEditingPayment(null);
      toast.success('Service charge updated successfully');
    } catch (error) {
      console.error('Error updating service charge:', error);
      toast.error('Failed to update service charge');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    return new Date(date.seconds * 1000).toLocaleDateString();
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
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Users className="h-6 w-6 text-indigo-600" />
            <h1 className="ml-2 text-2xl font-semibold">Payment Management</h1>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map(payment => (
                <tr key={payment.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {payment.userName || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {payment.userEmail}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{payment.title}</div>
                    <div className="text-xs text-gray-500">{payment.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      ₦{payment.amount.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDate(payment.dueDate)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      payment.status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => togglePaymentStatus(payment)}
                        disabled={isProcessing}
                        className={`inline-flex items-center px-3 py-1 rounded-md text-sm ${
                          payment.status === 'paid'
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : payment.status === 'paid' ? (
                          <X className="h-4 w-4" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEditPayment(payment)}
                        disabled={isProcessing}
                        className="inline-flex items-center px-3 py-1 rounded-md text-sm bg-blue-100 text-blue-800 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePayment(payment)}
                        disabled={isProcessing}
                        className="inline-flex items-center px-3 py-1 rounded-md text-sm bg-red-100 text-red-800 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Payment Modal */}
      {showEditModal && editingPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Edit Service Charge</h2>
            <form onSubmit={handleUpdatePayment}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <input
                    type="text"
                    value={editingPayment.title}
                    onChange={e => setEditingPayment({ ...editingPayment, title: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount (₦)</label>
                  <input
                    type="number"
                    value={editingPayment.amount}
                    onChange={e => setEditingPayment({ ...editingPayment, amount: Number(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={editingPayment.description}
                    onChange={e => setEditingPayment({ ...editingPayment, description: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Due Date</label>
                  <input
                    type="date"
                    value={editingPayment.dueDate}
                    onChange={e => setEditingPayment({ ...editingPayment, dueDate: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  disabled={isProcessing}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <div className="flex items-center">
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      Updating...
                    </div>
                  ) : (
                    'Update'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;