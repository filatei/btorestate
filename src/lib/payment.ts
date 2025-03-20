import { doc, updateDoc, addDoc, collection, serverTimestamp, getDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from './firebase';

interface Payment {
  id: string;
  amount: number;
  paidAmount?: number;
  estateId: string;
  status: 'pending' | 'paid' | 'partial' | 'review';
  paymentHistory?: Array<{
    amount: number;
    date: any;
    userId: string;
    method: string;
    receiptUrl?: string;
  }>;
}

export type PaymentMethod = 'direct' | 'manual' | 'paystack' | 'test';

export async function processPayment(
  payment: Payment,
  userId: string,
  amount: number,
  method: PaymentMethod,
  file?: File
) {
  try {
    const paymentRef = doc(db, 'serviceCharges', payment.id);
    const paymentDoc = await getDoc(paymentRef);
    
    if (!paymentDoc.exists()) {
      throw new Error('Payment not found');
    }

    const currentData = paymentDoc.data();
    const currentPaidAmount = currentData.paidAmount || 0;
    const newPaidAmount = currentPaidAmount + amount;
    const paymentHistory = currentData.paymentHistory || [];

    let receiptUrl;
    if (method === 'manual' && file) {
      const storage = getStorage();
      const fileRef = ref(storage, `receipts/${payment.estateId}/${userId}/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      receiptUrl = await getDownloadURL(fileRef);
    }

    const historyEntry = {
      amount,
      date: serverTimestamp(),
      userId,
      method,
      ...(receiptUrl && { receiptUrl })
    };

    const newStatus = method === 'manual' ? 'review' : 
                     newPaidAmount >= payment.amount ? 'paid' : 'partial';

    await updateDoc(paymentRef, {
      paidAmount: newPaidAmount,
      status: newStatus,
      lastPaymentDate: serverTimestamp(),
      paymentHistory: [...paymentHistory, historyEntry]
    });

    // Create notification for estate admins if manual payment
    if (method === 'manual') {
      const estateRef = doc(db, 'estates', payment.estateId);
      const estateDoc = await getDoc(estateRef);
      
      if (estateDoc.exists()) {
        const { admins } = estateDoc.data();
        await Promise.all(
          admins.map((adminId: string) =>
            addDoc(collection(db, 'notifications'), {
              type: 'payment',
              title: 'Payment Receipt Uploaded',
              message: `A payment receipt of ₦${amount.toLocaleString()} has been uploaded`,
              userId: adminId,
              estateId: payment.estateId,
              read: false,
              createdAt: serverTimestamp()
            })
          )
        );
      }
    }

    // Create notification for test payments
    if (method === 'test') {
      await addDoc(collection(db, 'notifications'), {
        type: 'payment',
        title: 'Test Payment Processed',
        message: `A test payment of ₦${amount.toLocaleString()} has been processed`,
        userId,
        estateId: payment.estateId,
        read: false,
        createdAt: serverTimestamp()
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Payment processing error:', error);
    throw error;
  }
}