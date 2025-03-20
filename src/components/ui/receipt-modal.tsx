import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

interface ReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptUrl: string;
  title?: string;
}

export function ReceiptModal({
  open,
  onOpenChange,
  receiptUrl,
  title = 'Payment Receipt'
}: ReceiptModalProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
    >
      <div className="relative">
        <img
          src={receiptUrl}
          alt="Payment Receipt"
          className="w-full h-auto max-h-[70vh] object-contain"
        />
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Modal>
  );
}