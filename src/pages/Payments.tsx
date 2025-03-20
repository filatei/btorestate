import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEstate } from '@/contexts/EstateContext';
import { Building2, Check } from 'lucide-react';
import { OutstandingPayments } from '@/components/OutstandingPayments';
import { PaymentHistory } from '@/components/PaymentHistory';
import { Button } from '@/components/ui/button';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

export default function Payments() {
  const { currentUser } = useAuth();
  const { selectedEstate } = useEstate();
  const navigate = useNavigate();
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
  const [paidPayments, setPaidPayments] = useState<Payment[]>([]);

  useEffect(() => {
    if (!currentUser || !selectedEstate) {
      navigate('/dashboard');
      return;
    }

    // Query service charges for the selected estate
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

  if (!selectedEstate) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">No Estate Selected</h2>
          <p className="text-gray-600 mb-4">Please select an estate to view payments.</p>
          <Button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center"
          >
            <Building2 className="h-5 w-5 mr-2" />
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Estate Header */}
      <div className="bg-card rounded-lg shadow-sm p-4 mb-8">
        <h1 className="text-xl font-semibold">{selectedEstate.name} - Payments</h1>
        <p className="text-sm text-muted-foreground">{selectedEstate.address}</p>
      </div>

      {/* Pending Payments */}
      <div className="mb-8">
        <OutstandingPayments payments={pendingPayments} />
      </div>

      {/* Payment History */}
      <PaymentHistory payments={paidPayments} />
    </div>
  );
}