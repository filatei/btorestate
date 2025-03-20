import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { format, isValid } from 'date-fns';

interface Payment {
  id: string;
  title: string;
  amount: number;
  paidAmount: number;
  description?: string;
  lastPaymentDate?: any;
  paymentMethod?: string;
  paymentHistory?: Array<{
    amount: number;
    date: any;
    method: string;
  }>;
}

interface PaymentHistoryProps {
  payments: Payment[];
}

const formatDate = (date: any) => {
  if (!date) return 'N/A';
  try {
    const timestamp = date.toDate ? date.toDate() : new Date(date);
    return isValid(timestamp) ? format(timestamp, 'MMM d, yyyy') : 'Invalid Date';
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid Date';
  }
};

export function PaymentHistory({ payments }: PaymentHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center">
          <Check className="h-6 w-6 text-green-600 mr-2" />
          <CardTitle>Payment History</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {payments.map(payment => (
                payment.paymentHistory?.map((history, index) => (
                  <tr key={`${payment.id}-${index}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium">{payment.title}</div>
                      <div className="text-sm text-muted-foreground">{payment.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">₦{history.amount.toLocaleString()}</div>
                      {index === payment.paymentHistory!.length - 1 && (
                        <div className="text-xs text-muted-foreground">
                          Total: ₦{payment.paidAmount.toLocaleString()} / ₦{payment.amount.toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">{formatDate(history.date)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">{history.method}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {index === payment.paymentHistory!.length - 1 && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          payment.paidAmount >= payment.amount
                            ? 'bg-green-100 text-green-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {payment.paidAmount >= payment.amount ? 'Fully Paid' : 'Partially Paid'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ))}
            </tbody>
          </table>
          {payments.length === 0 && (
            <p className="text-center text-muted-foreground py-4">No payment history</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}