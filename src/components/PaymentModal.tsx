import React, { useState } from 'react';
import { CreditCard, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  charge: {
    id: string;
    amount: number;
    title: string;
    estateId: string;
    paidAmount?: number;
  };
  onPaymentSuccess: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  charge,
  onPaymentSuccess
}) => {
  const { currentUser } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(charge.amount - (charge.paidAmount || 0));

  const handlePaystackPayment = () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    // Open Paystack payment page in a new window
    const paystackUrl = `https://checkout.paystack.com/`;
    const params = new URLSearchParams({
      email: currentUser?.email || '',
      amount: (paymentAmount * 100).toString(), // Convert to kobo
      reference: `${charge.id}-${Date.now()}`,
      callback_url: window.location.origin + '/payment/callback',
      currency: 'NGN'
    });

    const paymentWindow = window.open(paystackUrl + '?' + params.toString(), '_blank');
    
    if (!paymentWindow) {
      toast.error('Please allow popups to make payment');
      setIsProcessing(false);
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'paystack-payment-success') {
        handlePaymentSuccess(paymentAmount);
        window.removeEventListener('message', handleMessage);
      }
    };

    window.addEventListener('message', handleMessage);

    const cleanup = () => {
      window.removeEventListener('message', handleMessage);
      setIsProcessing(false);
    };

    setTimeout(cleanup, 300000);
  };

  const handleTestPayment = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      const paymentRef = doc(db, 'serviceCharges', charge.id);
      const docSnap = await getDoc(paymentRef);
      const currentData = docSnap.data();
      const currentPaidAmount = currentData?.paidAmount || 0;
      const newPaidAmount = currentPaidAmount + paymentAmount;
      const isFullyPaid = newPaidAmount >= charge.amount;

      await updateDoc(paymentRef, {
        paidAmount: newPaidAmount,
        status: isFullyPaid ? 'paid' : 'partial',
        lastPaymentDate: new Date(),
        userId: currentUser?.uid,
        paymentMethod: 'test',
        paymentHistory: [...(currentData?.paymentHistory || []), {
          amount: paymentAmount,
          date: new Date(),
          userId: currentUser?.uid,
          method: 'test'
        }]
      });
      handlePaymentSuccess(paymentAmount);
    } catch (error) {
      console.error('Error processing test payment:', error);
      toast.error('Failed to process payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = (amount: number) => {
    setIsProcessing(false);
    onPaymentSuccess();
    onClose();
    toast.success(`Payment of ₦${amount.toLocaleString()} successful`);
  };

  if (!isOpen) return null;

  const remainingAmount = charge.amount - (charge.paidAmount || 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">Pay Service Charge</h2>
        <div className="mb-6">
          <p className="text-gray-600">Total Amount: ₦{charge.amount.toLocaleString()}</p>
          {charge.paidAmount > 0 && (
            <>
              <p className="text-gray-600">Paid Amount: ₦{charge.paidAmount.toLocaleString()}</p>
              <p className="text-gray-600">Remaining: ₦{remainingAmount.toLocaleString()}</p>
            </>
          )}
          <p className="text-gray-600">Service: {charge.title}</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Amount (₦)
          </label>
          <input
            type="number"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(Math.min(Number(e.target.value), remainingAmount))}
            max={remainingAmount}
            min={1}
            className="w-full p-2 border border-gray-300 rounded-lg"
          />
        </div>

        <button
          onClick={handlePaystackPayment}
          disabled={isProcessing || paymentAmount <= 0}
          className="w-full p-4 mb-4 bg-indigo-600 text-white rounded-lg flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="h-5 w-5 mr-2" />
              Pay ₦{paymentAmount.toLocaleString()} with Paystack
            </>
          )}
        </button>

        <button
          onClick={handleTestPayment}
          disabled={isProcessing || paymentAmount <= 0}
          className="w-full p-4 mb-4 bg-green-600 text-white rounded-lg flex items-center justify-center hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Check className="h-5 w-5 mr-2" />
              Test Payment (₦{paymentAmount.toLocaleString()})
            </>
          )}
        </button>

        <button
          onClick={onClose}
          disabled={isProcessing}
          className="w-full p-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default PaymentModal;