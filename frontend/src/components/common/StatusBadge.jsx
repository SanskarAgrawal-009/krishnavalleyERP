import React from 'react';
import {
  CheckCircle,
  AlertTriangle,
  Clock,
  XCircle,
  HelpCircle,
  ShieldCheck,
  Zap,
  Check,
  Repeat,
  RotateCcw,
  RefreshCw
} from 'lucide-react';

export const StatusBadge = ({ status, size = 'normal', showIcon = true }) => {
  const getStyle = () => {
    switch ((status || '').toLowerCase().replace(/\s+/g, '_')) {
      case 'available':
      case 'on_track':
      case 'ontrack':
      case 'active':
      case 'optimal':
      case 'resolved':
      case 'paid':
      case 'fully_paid':
      case 'delivered':
      case 'completed':
      case 'approved':
        return {
          bg: '#e8f2e5',
          color: '#17652f',
          border: '#cde4c9',
          label: status === 'on_track' ? 'On Track' : status?.replace(/_/g, ' ') || 'Active',
          Icon: CheckCircle
        };

      case 'resell':
      case 'resold':
        return {
          bg: '#f4f6f4',
          color: '#2d3748',
          border: '#e2e8e0',
          label: 'Resell',
          Icon: Repeat
        };

      case 'buy_back':
      case 'buyback':
        return {
          bg: '#f0f7f0',
          color: '#1b4d2e',
          border: '#cfe2ce',
          label: 'Buy Back',
          Icon: RotateCcw
        };

      case 'possession_renewal':
      case 'renewal':
        return {
          bg: '#e8f2e5',
          color: '#17652f',
          border: '#cde4c9',
          label: 'Possession Renewal',
          Icon: RefreshCw
        };

      case 'hold':
      case 'on_hold':
      case 'pending':
      case 'in_progress':
      case 'payment_in_progress':
      case 'draft':
      case 'under_review':
        return {
          bg: '#fef3c7',
          color: '#b45309',
          border: '#fde68a',
          label: status?.replace(/_/g, ' ') || 'Pending',
          Icon: Clock
        };

      case 'booked':
      case 'sold':
      case 'leased':
      case 'agreement_signed':
      case 'agreement_completed':
      case 'possessed':
      case 'occupied':
      case 'tenant_allocated':
      case 'rent_back_active':
      case 'planning':
      case 'operational':
        return {
          bg: '#17652f',
          color: '#ffffff',
          border: '#17652f',
          label: status === 'sold' ? 'Sold' : (status === 'leased' ? 'Leased' : status?.replace(/_/g, ' ') || 'Allocated'),
          Icon: ShieldCheck
        };

      case 'cancelled':
      case 'at_risk':
      case 'atrisk':
      case 'terminated':
      case 'expired':
      case 'failed':
      case 'blocked':
      case 'critical':
      case 'high_risk':
        return {
          bg: '#fef2f2',
          color: '#b91c1c',
          border: '#fecaca',
          label: status === 'at_risk' ? 'At Risk' : status?.replace(/_/g, ' ') || 'Cancelled',
          Icon: AlertTriangle
        };

      default:
        return {
          bg: '#f8f9fa',
          color: '#4b5563',
          border: '#e8e6df',
          label: status || 'Unknown',
          Icon: HelpCircle
        };
    }
  };

  const { bg, color, border, label, Icon } = getStyle();

  return (
    <span
      style={{
        backgroundColor: bg,
        color: color,
        border: `1px solid ${border}`,
        fontSize: size === 'small' ? '0.7rem' : '0.75rem',
        padding: size === 'small' ? '2px 7px' : '3px 9px',
        borderRadius: '6px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontWeight: '600',
        textTransform: 'capitalize',
        letterSpacing: '0.01em',
        lineHeight: 1.2
      }}
    >
      {showIcon && <Icon size={size === 'small' ? 11 : 13} strokeWidth={2.5} />}
      <span>{label}</span>
    </span>
  );
};

export default StatusBadge;

