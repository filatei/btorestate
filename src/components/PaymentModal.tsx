import React, { useState, useRef } from 'react';
import { CreditCard, Check, Loader2, Upload, X, Image as ImageIcon, CreditCard as PaystackIcon, Banknote } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, addDoc, collection, serverTimestamp, Timestamp, runTransaction } from 'firebase/firestore';
import { storage, db } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'manual' | 'paystack' | 'test'>('manual');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePaymentComplete = (amount: number) => {
    setIsProcessing(false);
    onClose();
    onPaymentSuccess();
    toast.success(`Payment of ₦${amount.toLocaleString()} successful`);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > 800) {
            height = Math.round((height * 800) / width);
            width = 800;
          }
        } else {
          if (height > 800) {
            width = Math.round((width * 800) / height);
            height = 800;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          0.7
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const uploadImage = async (file: Blob): Promise<string> => {
    try {
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(7);
      const fileName = `receipts/${charge.estateId}/${currentUser?.uid}/${timestamp}_${randomString}.jpg`;
      const fileRef = ref(storage, fileName);

      // Convert Blob to File with proper type
      const imageFile = new File([file], fileName, { type: 'image/jpeg' });
      
      // Upload file
      await uploadBytes(fileRef, imageFile);
      return await getDownloadURL(fileRef);
    } catch (error) {
      console.error('Upload error:', error);
      throw new Error('Failed to upload image');
    }
  };

  const handleTestPayment = async () => {
    if (!currentUser) return;
    setIsProcessing(true);
    const toastId = toast.loading('Processing test payment...');

    try {
      await runTransaction(db, async (transaction) => {
        const chargeRef = doc(db, 'serviceCharges', charge.id);
        const chargeDoc = await transaction.get(chargeRef);
        
        if (!chargeDoc.exists()) {
          throw new Error('Payment charge not found');
        }

        const chargeData = chargeDoc.data();
        const currentPaidAmount = chargeData.paidAmount || 0;

        if (currentPaidAmount + paymentAmount > charge.amount) {
          throw new Error('Payment amount exceeds remaining balance');
        }

        const newPaidAmount = currentPaidAmount + paymentAmount;
        const isFullyPaid = newPaidAmount >= charge.amount;
        const now = Timestamp.now();

        const paymentHistory = chargeData.paymentHistory || [];
        paymentHistory.push({
          amount: paymentAmount,
          date: now,
          userId: currentUser.uid,
          method: 'test',
          status: 'success'
        });

        transaction.update(chargeRef, {
          paidAmount: newPaidAmount,
          status: isFullyPaid ? 'paid' : 'partial',
          lastPaymentDate: now,
          paymentMethod: 'test',
          paymentHistory
        });

        // Create notification
        const notificationRef = doc(collection(db, 'notifications'));
        transaction.set(notificationRef, {
          userId: charge.estateId,
          type: 'payment',
          title: 'Test Payment Received',
          message: `A test payment of ₦${paymentAmount.toLocaleString()} has been processed for ${charge.title}`,
          read: false,
          createdAt: now
        });
      });

      toast.success('Test payment processed successfully', { id: toastId });
      handlePaymentComplete(paymentAmount);
    } catch (error: any) {
      console.error('Error processing test payment:', error);
      toast.error(error.message || 'Failed to process test payment', { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaystackPayment = async () => {
    toast.error('Paystack integration coming soon!');
  };

  const handleUploadReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !currentUser || isProcessing) return;

    setIsProcessing(true);
    const toastId = toast.loading('Processing payment...');

    try {
      // Compress and upload image
      const compressedImage = await compressImage(selectedFile);
      const downloadURL = await uploadImage(compressedImage);

      if (!downloadURL) {
        throw new Error('Failed to upload image');
      }

      // Use a transaction to handle the payment update atomically
      await runTransaction(db, async (transaction) => {
        const chargeRef = doc(db, 'serviceCharges', charge.id);
        const chargeDoc = await transaction.get(chargeRef);
        
        if (!chargeDoc.exists()) {
          throw new Error('Payment charge not found');
        }

        const chargeData = chargeDoc.data();
        const currentPaidAmount = chargeData.paidAmount || 0;

        // Validate payment amount
        if (currentPaidAmount + paymentAmount > charge.amount) {
          throw new Error('Payment amount exceeds remaining balance');
        }

        const newPaidAmount = currentPaidAmount + paymentAmount;
        const isFullyPaid = newPaidAmount >= charge.amount;
        const now = Timestamp.now();

        // Update payment history
        const paymentHistory = chargeData.paymentHistory || [];
        paymentHistory.push({
          amount: paymentAmount,
          date: now,
          userId: currentUser.uid,
          method: 'manual',
          receiptUrl: downloadURL
        });

        // Update charge document
        transaction.update(chargeRef, {
          paidAmount: newPaidAmount,
          status: isFullyPaid ? 'paid' : 'partial',
          lastPaymentDate: now,
          paymentMethod: 'manual',
          paymentHistory
        });

        // Create notification
        const notificationRef = doc(collection(db, 'notifications'));
        transaction.set(notificationRef, {
          userId: charge.estateId,
          type: 'payment',
          title: 'Payment Receipt Uploaded',
          message: `A payment receipt of ₦${paymentAmount.toLocaleString()} has been uploaded for ${charge.title}`,
          read: false,
          createdAt: now
        });
      });

      toast.success('Payment receipt uploaded successfully', { id: toastId });
      handlePaymentComplete(paymentAmount);
    } catch (error: any) {
      console.error('Error processing payment:', error);
      toast.error(error.message || 'Failed to process payment', { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const remainingAmount = charge.amount - (charge.paidAmount || 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Pay Service Charge</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

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

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Method
          </label>
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => setPaymentMethod('manual')}
              className={`p-4 border rounded-lg flex flex-col items-center justify-center ${
                paymentMethod === 'manual'
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Upload className="h-6 w-6 mb-2" />
              <span className="text-sm">Manual</span>
            </button>
            <button
              onClick={() => setPaymentMethod('paystack')}
              className={`p-4 border rounded-lg flex flex-col items-center justify-center ${
                paymentMethod === 'paystack'
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <PaystackIcon className="h-6 w-6 mb-2" />
              <span className="text-sm">Paystack</span>
            </button>
            <button
              onClick={() => setPaymentMethod('test')}
              className={`p-4 border rounded-lg flex flex-col items-center justify-center ${
                paymentMethod === 'test'
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Banknote className="h-6 w-6 mb-2" />
              <span className="text-sm">Test Pay</span>
            </button>
          </div>
        </div>

        {paymentMethod === 'manual' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Receipt
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                {previewUrl ? (
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Receipt preview"
                      className="mx-auto h-32 w-auto object-contain"
                    />
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }}
                      className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                      >
                        <span>Upload a file</span>
                        <input
                          id="file-upload"
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="sr-only"
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {paymentMethod === 'manual' && (
            <button
              onClick={handleUploadReceipt}
              disabled={!selectedFile || isProcessing || paymentAmount <= 0}
              className="w-full p-4 bg-indigo-600 text-white rounded-lg flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5 mr-2" />
                  Upload Receipt and Complete Payment
                </>
              )}
            </button>
          )}

          {paymentMethod === 'paystack' && (
            <button
              onClick={handlePaystackPayment}
              disabled={isProcessing || paymentAmount <= 0}
              className="w-full p-4 bg-green-600 text-white rounded-lg flex items-center justify-center hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <PaystackIcon className="h-5 w-5 mr-2" />
                  Pay with Paystack
                </>
              )}
            </button>
          )}

          {paymentMethod === 'test' && (
            <button
              onClick={handleTestPayment}
              disabled={isProcessing || paymentAmount <= 0}
              className="w-full p-4 bg-purple-600 text-white rounded-lg flex items-center justify-center hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Banknote className="h-5 w-5 mr-2" />
                  Complete Test Payment
                </>
              )}
            </button>
          )}

          <button
            onClick={onClose}
            disabled={isProcessing}
            className="w-full p-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;