import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Upload, Wallet } from 'lucide-react';
import { PaymentStatus } from '@/components/PaymentStatus';
import { format } from 'date-fns';

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

interface PaymentCardProps {
  payment: Payment;
  onPayNow: (payment: Payment) => void;
  onUploadReceipt: (payment: Payment) => void;
  onViewReceipt?: (payment: Payment) => void;
}

const formatDate = (date: any) => {
  if (!date) return 'N/A';
  try {
    const timestamp = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return format(timestamp, 'MMM d, yyyy');
  } catch (error) {
    return 'Invalid Date';
  }
};

export function PaymentCard({ payment, onPayNow, onUploadReceipt, onViewReceipt }: PaymentCardProps) {
  const remainingAmount = payment.amount - (payment.paidAmount || 0);

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{payment.title}</CardTitle>
            <CardDescription>Due: {formatDate(payment.dueDate)}</CardDescription>
          </div>
          <PaymentStatus 
            status={payment.status}
            amount={payment.amount}
            paidAmount={payment.paidAmount}
          />
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex flex-col gap-1">
          <div className="text-2xl font-bold text-primary">
            ₦{remainingAmount.toLocaleString()}
          </div>
          {payment.paidAmount > 0 && (
            <div className="text-sm text-muted-foreground">
              Paid: ₦{payment.paidAmount.toLocaleString()} of ₦{payment.amount.toLocaleString()}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        {payment.status === 'review' ? (
          <Button
            variant="outline"
            onClick={() => onViewReceipt?.(payment)}
            className="w-full"
          >
            <Eye className="h-4 w-4 mr-2" />
            View Receipt
          </Button>
        ) : (
          <>
            <Button
              variant="default"
              onClick={() => onPayNow(payment)}
              className="flex-1"
            >
              <Wallet className="h-4 w-4 mr-2" />
              Pay Now
            </Button>
            <Button
              variant="outline"
              onClick={() => onUploadReceipt(payment)}
            >
              <Upload className="h-4 w-4" />
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}