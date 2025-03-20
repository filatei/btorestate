import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PaymentCard } from '@/components/PaymentCard';
import { PaymentModal } from '@/components/ui/payment-modal';
import { UploadModal } from '@/components/ui/upload-modal';
import { ReceiptModal } from '@/components/ui/receipt-modal';
import { Clock } from 'lucide-react';
import { processPayment } from '@/lib/payment';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

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

interface OutstandingPaymentsProps {
  payments: Payment[];
  title?: string;
  onPaymentComplete?: () => void;
}

export function OutstandingPayments({ 
  payments, 
  title = "Outstanding Payments",
  onPaymentComplete 
}: OutstandingPaymentsProps) {
  const { currentUser } = useAuth();
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const handlePayment = async (amount: number, method: 'direct' | 'manual', file?: File) => {
    if (!selectedPayment || !currentUser) return;

    try {
      await processPayment(selectedPayment, currentUser.uid, amount, method, file);
      toast.success(method === 'direct' ? 'Payment processed successfully' : 'Receipt uploaded successfully');
      onPaymentComplete?.();
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to process payment');
    }
  };

  if (payments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <Clock className="h-6 w-6 text-primary mr-2" />
            <CardTitle>{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No pending payments</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="h-6 w-6 text-primary mr-2" />
              <CardTitle>{title}</CardTitle>
            </div>
            <span className="text-sm text-muted-foreground">
              {payments.length} {payments.length === 1 ? 'payment' : 'payments'} pending
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {payments.map(payment => (
              <PaymentCard
                key={payment.id}
                payment={payment}
                onPayNow={(payment) => {
                  setSelectedPayment(payment);
                  setShowPaymentModal(true);
                }}
                onUploadReceipt={(payment) => {
                  setSelectedPayment(payment);
                  setShowUploadModal(true);
                }}
                onViewReceipt={payment.receiptUrl ? (payment) => {
                  setSelectedPayment(payment);
                  setShowReceiptModal(true);
                } : undefined}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedPayment && (
        <>
          <PaymentModal
            open={showPaymentModal}
            onOpenChange={setShowPaymentModal}
            title={selectedPayment.title}
            amount={selectedPayment.amount}
            paidAmount={selectedPayment.paidAmount}
            onSubmit={handlePayment}
          />

          <UploadModal
            open={showUploadModal}
            onOpenChange={setShowUploadModal}
            title={selectedPayment.title}
            maxAmount={selectedPayment.amount - (selectedPayment.paidAmount || 0)}
            onSubmit={async (amount, file) => {
              await handlePayment(amount, 'manual', file);
            }}
          />

          {selectedPayment.receiptUrl && (
            <ReceiptModal
              open={showReceiptModal}
              onOpenChange={setShowReceiptModal}
              receiptUrl={selectedPayment.receiptUrl}
            />
          )}
        </>
      )}
    </>
  );
}