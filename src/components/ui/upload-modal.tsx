import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  maxAmount: number;
  onSubmit: (amount: number, file: File) => Promise<void>;
}

export function UploadModal({
  open,
  onOpenChange,
  title,
  maxAmount,
  onSubmit
}: UploadModalProps) {
  const [amount, setAmount] = useState(maxAmount);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsSubmitting(true);
    try {
      await onSubmit(amount, file);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Upload Payment Receipt"
      description={`Upload your receipt for ${title}`}
    >
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="amount">Payment Amount (₦)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              max={maxAmount}
              min={1}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="receipt">Receipt Image</Label>
            <Input
              id="receipt"
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
            />
            <p className="text-sm text-muted-foreground">
              Maximum file size: 5MB
            </p>
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
            disabled={!file || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload Receipt'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}