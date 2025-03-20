import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';

interface PaymentStatusProps {
  status: 'pending' | 'partial' | 'paid' | 'review';
  amount?: number;
  paidAmount?: number;
}

export function PaymentStatus({ status, amount, paidAmount }: PaymentStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'paid':
        return {
          label: 'Paid',
          variant: 'success' as const,
          icon: CheckCircle,
          tooltip: 'Payment completed'
        };
      case 'partial':
        return {
          label: 'Partially Paid',
          variant: 'warning' as const,
          icon: Clock,
          tooltip: amount && paidAmount
            ? `₦${paidAmount.toLocaleString()} of ₦${amount.toLocaleString()} paid`
            : 'Partial payment received'
        };
      case 'review':
        return {
          label: 'Under Review',
          variant: 'secondary' as const,
          icon: HelpCircle,
          tooltip: 'Payment receipt is being reviewed'
        };
      default:
        return {
          label: 'Pending',
          variant: 'destructive' as const,
          icon: AlertCircle,
          tooltip: 'Payment not yet received'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge variant={config.variant} className="flex items-center gap-1">
            <Icon className="h-3 w-3" />
            <span>{config.label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}