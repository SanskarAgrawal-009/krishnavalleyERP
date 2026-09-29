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
          bg: '#eff6ff',
          color: '#1d4ed8',
          border: '#bfdbfe',
          label: status === 'on_track' ? 'On Track' : status?.replace(/_/g, ' ') || 'Active',
          Icon: CheckCircle
        };

      case 'resell':
      case 'resold':
        return {
          bg: '#f1f5f9',
          color: '#1e293b',
          border: '#cbd5e1',
          label: 'Resell',
          Icon: Repeat
        };

      case 'buy_back':
      case 'buyback':
        return {
          bg: '#e0f2fe',
          color: '#0284c7',
          border: '#bae6fd',
          label: 'Buy Back',
          Icon: RotateCcw
        };

      case 'possession_renewal':
      case 'renewal':
        return {
          bg: '#eff6ff',
          color: '#1e40af',
          border: '#bfdbfe',
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
          bg: '#f8fafc',
          color: '#475569',
          border: '#e2e8f0',
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
          bg: '#d8e2ff',
          color: '#00285c',
          border: '#adc7ff',
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
          bg: '#0f172a',
          color: '#ffffff',
          border: '#1e293b',
          label: status === 'at_risk' ? 'At Risk' : status?.replace(/_/g, ' ') || 'Cancelled',
          Icon: AlertTriangle
        };

      default:
        return {
          bg: '#f1f3f4',
          color: '#414754',
          border: '#dadce0',
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

