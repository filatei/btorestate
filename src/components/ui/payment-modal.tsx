import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { CreditCard, Loader2, Upload, Wallet, Banknote } from 'lucide-react';
import { PaymentMethod } from '@/lib/payment';

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  amount: number;
  paidAmount?: number;
  onSubmit: (amount: number, method: PaymentMethod, file?: File) => Promise<void>;
}

export function PaymentModal({
  open,
  onOpenChange,
  title,
  amount,
  paidAmount = 0,
  onSubmit
}: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('direct');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const remainingAmount = amount - paidAmount;
  const [paymentAmount, setPaymentAmount] = useState(remainingAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentAmount <= 0 || isSubmitting) return;
    if (paymentMethod === 'manual' && !file) return;

    setIsSubmitting(true);
    try {
      await onSubmit(paymentAmount, paymentMethod, file || undefined);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Complete Payment"
      description={`Payment for ${title}`}
    >
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <Button
              type="button"
              variant={paymentMethod === 'direct' ? 'default' : 'outline'}
              onClick={() => setPaymentMethod('direct')}
              className="w-full"
            >
              <Wallet className="mr-2 h-4 w-4" />
              Direct Payment
            </Button>
            <Button
              type="button"
              variant={paymentMethod === 'paystack' ? 'default' : 'outline'}
              onClick={() => setPaymentMethod('paystack')}
              className="w-full"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Paystack
            </Button>
            <Button
              type="button"
              variant={paymentMethod === 'manual' ? 'default' : 'outline'}
              onClick={() => setPaymentMethod('manual')}
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Receipt
            </Button>
            <Button
              type="button"
              variant={paymentMethod === 'test' ? 'default' : 'outline'}
              onClick={() => setPaymentMethod('test')}
              className="w-full"
            >
              <Banknote className="mr-2 h-4 w-4" />
              Test Pay
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Total Amount Due</Label>
              <div className="text-2xl font-bold">₦{remainingAmount.toLocaleString()}</div>
              {paidAmount > 0 && (
                <p className="text-sm text-muted-foreground">
                  Previously paid: ₦{paidAmount.toLocaleString()}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Payment Amount</Label>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Math.min(Math.max(Number(e.target.value), 0), remainingAmount))}
                  min={1}
                  max={remainingAmount}
                  className="w-full"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  of ₦{remainingAmount.toLocaleString()}
                </span>
              </div>
              <Slider
                value={[paymentAmount]}
                onValueChange={(values) => setPaymentAmount(values[0])}
                max={remainingAmount}
                min={0}
                step={100}
                className="mt-2"
              />
            </div>

            {paymentMethod === 'manual' && (
              <div>
                <Label htmlFor="receipt">Upload Receipt</Label>
                <Input
                  id="receipt"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Maximum file size: 5MB
                </p>
              </div>
            )}

            {paymentMethod === 'paystack' && (
              <p className="text-sm text-muted-foreground">
                You will be redirected to Paystack's secure payment page to complete your payment.
              </p>
            )}

            {paymentMethod === 'test' && (
              <p className="text-sm text-muted-foreground">
                This is a test payment for demonstration purposes only. No actual money will be transferred.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || paymentAmount <= 0 || (paymentMethod === 'manual' && !file)}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {paymentMethod === 'paystack' ? (
                  <CreditCard className="mr-2 h-4 w-4" />
                ) : paymentMethod === 'test' ? (
                  <Banknote className="mr-2 h-4 w-4" />
                ) : (
                  <Wallet className="mr-2 h-4 w-4" />
                )}
                Pay ₦{paymentAmount.toLocaleString()}
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}