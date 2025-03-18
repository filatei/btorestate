import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useEstate } from '../contexts/EstateContext';
import { CreditCard, Upload, Clock, Check, X, FileText, Eye } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface Payment {
  id: string;
  title: string;
  amount: number;
  dueDate: any;
  status: 'pending' | 'paid' | 'partial' | 'review';
  paidAmount?: number;
  receiptUrl?: string;
  lastPaymentDate?: any;
  paymentMethod?: string;
  estateId: string;
}

const Payments = () => {
  const { currentUser } = useAuth();
  const { selectedEstate } = useEstate();
  const navigate = useNavigate();
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
  const [paidPayments, setPaidPayments] = useState<Payment[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);

  useEffect(() => {
    if (!currentUser || !selectedEstate) {
      navigate('/dashboard');
      return;
    }

    const paymentsQuery = query(
      collection(db, 'serviceCharges'),
      where('estateId', '==', selectedEstate.id)
    );

    const unsubscribe = onSnapshot(paymentsQuery, (snapshot) => {
      const payments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Payment[];

      setPendingPayments(payments.filter(p => ['pending', 'partial', 'review'].includes(p.status)));
      setPaidPayments(payments.filter(p => p.status === 'paid'));
    });

    return () => unsubscribe();
  }, [currentUser, selectedEstate, navigate]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.size <= 5 * 1024 * 1024) {
      setSelectedFile(file);
    } else {
      toast.error('File size must be less than 5MB');
    }
  };

  const handleUploadReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !selectedPayment || !currentUser || !selectedEstate || isUploading) return;

    setIsUploading(true);
    try {
      const storage = getStorage();
      const fileRef = ref(storage, `receipts/${selectedEstate.id}/${currentUser.uid}/${Date.now()}_${selectedFile.name}`);
      await uploadBytes(fileRef, selectedFile);
      const downloadURL = await getDownloadURL(fileRef);

      const paymentRef = doc(db, 'serviceCharges', selectedPayment.id);
      
      // Check if payment is already being processed
      const paymentDoc = await getDoc(paymentRef);
      if (paymentDoc.data()?.status === 'review') {
        throw new Error('This payment is already being processed by another user');
      }

      await updateDoc(paymentRef, {
        status: 'review',
        receiptUrl: downloadURL,
        paidAmount: paymentAmount,
        lastPaymentDate: serverTimestamp(),
        paymentMethod: 'manual'
      });

      // Create notification for estate admins
      const notificationPromises = selectedEstate.admins.map(adminId =>
        addDoc(collection(db, 'notifications'), {
          type: 'payment',
          title: 'Payment Receipt Uploaded',
          message: `A payment receipt has been uploaded for ${selectedPayment.title}`,
          userId: adminId,
          estateId: selectedEstate.id,
          read: false,
          createdAt: serverTimestamp()
        })
      );

      await Promise.all(notificationPromises);

      setShowUploadModal(false);
      setSelectedFile(null);
      toast.success('Receipt uploaded successfully');
    } catch (error: any) {
      console.error('Error uploading receipt:', error);
      toast.error(error.message || 'Failed to upload receipt');
    } finally {
      setIsUploading(false);
    }
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

  if (!selectedEstate) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">No Estate Selected</h2>
          <p className="text-gray-600 mb-4">Please select an estate to view payments.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Estate Header */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-8">
        <h1 className="text-xl font-semibold text-gray-900">{selectedEstate.name} - Payments</h1>
        <p className="text-sm text-gray-500">{selectedEstate.address}</p>
      </div>

      {/* Pending Payments */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center mb-6">
          <Clock className="h-6 w-6 text-orange-600" />
          <h2 className="ml-2 text-2xl font-semibold">Pending Payments</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pendingPayments.map(payment => (
            <div key={payment.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-medium text-lg">{payment.title}</h3>
                  <p className="text-sm text-gray-500">Due: {formatDate(payment.dueDate)}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-indigo-600">
                    ₦{payment.amount.toLocaleString()}
                  </p>
                  {payment.status === 'partial' && (
                    <p className="text-sm text-orange-600">
                      Paid: ₦{(payment.paidAmount || 0).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  payment.status === 'review'
                    ? 'bg-yellow-100 text-yellow-800'
                    : payment.status === 'partial'
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {payment.status === 'review' ? 'Under Review' : 
                   payment.status === 'partial' ? 'Partially Paid' : 'Pending'}
                </span>
                
                {payment.status === 'review' ? (
                  <button
                    onClick={() => {
                      setSelectedPayment(payment);
                      setShowReceiptModal(true);
                    }}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedPayment(payment);
                      setPaymentAmount(payment.amount - (payment.paidAmount || 0));
                      setShowUploadModal(true);
                    }}
                    className="flex items-center px-3 py-1 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Upload Receipt
                  </button>
                )}
              </div>
            </div>
          ))}

          {pendingPayments.length === 0 && (
            <p className="text-center text-gray-500 py-4 col-span-3">No pending payments</p>
          )}
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-6">
          <Check className="h-6 w-6 text-green-600" />
          <h2 className="ml-2 text-2xl font-semibold">Payment History</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paidPayments.map(payment => (
                <tr key={payment.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{payment.title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">₦{payment.amount.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{formatDate(payment.lastPaymentDate)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{payment.paymentMethod}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {payment.receiptUrl && (
                      <a
                        href={payment.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <FileText className="h-5 w-5" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {paidPayments.length === 0 && (
            <p className="text-center text-gray-500 py-4">No payment history</p>
          )}
        </div>
      </div>

      {/* Upload Receipt Modal */}
      {showUploadModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Upload Payment Receipt</h2>
            <form onSubmit={handleUploadReceipt}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Amount (₦)</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    max={selectedPayment.amount}
                    min={1}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Receipt Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="mt-1 block w-full"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">Maximum file size: 5MB</p>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || isUploading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isUploading ? 'Uploading...' : 'Upload Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Receipt Modal */}
      {showReceiptModal && selectedPayment?.receiptUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Payment Receipt</h2>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <img
              src={selectedPayment.receiptUrl}
              alt="Payment Receipt"
              className="w-full h-auto max-h-[70vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;