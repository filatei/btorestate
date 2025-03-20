import React, { useState } from 'react';
import { CreditCard, Upload, Loader2, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

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
  const [paymentMethod, setPaymentMethod] = useState<'direct' | 'manual'>('direct');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const remainingAmount = charge.amount - (charge.paidAmount || 0);
  const [paymentAmount, setPaymentAmount] = useState(remainingAmount);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.size <= 5 * 1024 * 1024) {
      setSelectedFile(file);
    }
  };

  const handleAmountChange = (value: number) => {
    setPaymentAmount(Math.min(Math.max(value, 0), remainingAmount));
  };

  return (
    <Modal
      open={isOpen}
      onOpenChange={onClose}
      title="Complete Payment"
      description={`Payment for ${charge.title}`}
    >
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
            variant={paymentMethod === 'manual' ? 'default' : 'outline'}
            onClick={() => setPaymentMethod('manual')}
            className="w-full"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Receipt
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Total Amount Due</Label>
            <div className="text-2xl font-bold">₦{remainingAmount.toLocaleString()}</div>
            {charge.paidAmount > 0 && (
              <p className="text-sm text-muted-foreground">
                Previously paid: ₦{charge.paidAmount.toLocaleString()}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Payment Amount</Label>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => handleAmountChange(Number(e.target.value))}
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
              onValueChange={(values) => handleAmountChange(values[0])}
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
                onChange={handleFileChange}
                className="mt-1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Maximum file size: 5MB
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={() => {
            // Handle payment submission
            onPaymentSuccess();
            onClose();
          }}
          disabled={isProcessing || (paymentMethod === 'manual' && !selectedFile) || paymentAmount <= 0}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Pay ₦{paymentAmount.toLocaleString()}
            </>
          )}
        </Button>
      </div>
    </Modal>
  );
};

export default PaymentModal;