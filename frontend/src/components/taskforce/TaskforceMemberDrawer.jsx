import React, { useEffect } from 'react';
import {
  X,
  Shield,
  Briefcase,
  HardHat,
  User,
  Phone,
  Sparkles,
  Layers,
} from 'lucide-react';
import { TaskforceMemberDashboard } from './TaskforceMemberDashboard.jsx';

export const TaskforceMemberDrawer = ({
  isOpen,
  onClose,
  member = null,
  onAssignTask,
  onOpenTaskDetail,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when drawer is open
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const memberObj = typeof member === 'object' && member !== null ? member : null;
  const memberId = memberObj?._id || (typeof member === 'string' ? member : '');

  const getTierBadge = (level) => {
    switch (level) {
      case 'head':
        return {
          label: 'HEAD',
          icon: Briefcase,
          bg: '#ecfeff',
          color: '#0e7490',
          border: '#a5f3fc',
        };
      case 'supervisor':
        return {
          label: 'SUPERVISOR',
          icon: Shield,
          bg: '#eef2ff',
          color: '#4338ca',
          border: '#c7d2fe',
        };
      case 'helper':
      default:
        return {
          label: 'HELPER',
          icon: HardHat,
          bg: '#eff6ff',
          color: '#1d4ed8',
          border: '#bfdbfe',
        };
    }
  };

  const badgeInfo = memberObj?.hierarchyLevel ? getTierBadge(memberObj.hierarchyLevel) : null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1050,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <style>{`
        @keyframes drawerFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes drawerSlideLeft {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(3px)',
          animation: 'drawerFadeIn 0.2s ease-out',
        }}
      />

      {/* Slide-Over Drawer Container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '920px',
          height: '100%',
          backgroundColor: '#f8fafc',
          boxShadow: '-8px 0 35px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1051,
          animation: 'drawerSlideLeft 0.26s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* ========================================================================= */}
        {/* DRAWER TOP BAR */}
        {/* ========================================================================= */}
        <div
          style={{
            padding: '14px 24px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
            zIndex: 10,
          }}
        >
          {/* Member Quick Info Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #bfdbfe',
                flexShrink: 0,
              }}
            >
              {memberObj?.hierarchyLevel === 'head' ? (
                <Briefcase size={20} />
              ) : memberObj?.hierarchyLevel === 'supervisor' ? (
                <Shield size={20} />
              ) : (
                <HardHat size={20} />
              )}
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {memberObj ? memberObj.name : 'Member Dashboard'}
                </h2>

                {badgeInfo && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 7px',
                      borderRadius: '8px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      background: badgeInfo.bg,
                      color: badgeInfo.color,
                      border: `1px solid ${badgeInfo.border}`,
                    }}
                  >
                    <badgeInfo.icon size={11} />
                    {badgeInfo.label}
                  </span>
                )}

                {memberObj?.trade && (
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '8px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      background: '#f1f5f9',
                      color: '#475569',
                    }}
                  >
                    {memberObj.trade}
                  </span>
                )}
              </div>

              <div
                style={{
                  fontSize: '0.74rem',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '2px',
                }}
              >
                <span>Live Operations Workspace</span>
                {memberObj?.phone && (
                  <>
                    <span>•</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <Phone size={11} /> {memberObj.phone}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Close & Shortcuts */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <span
              style={{
                fontSize: '0.7rem',
                color: '#94a3b8',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '3px 7px',
                borderRadius: '6px',
                fontFamily: 'monospace',
                fontWeight: 600,
              }}
            >
              ESC
            </span>

            <button
              type="button"
              onClick={onClose}
              title="Close Dashboard Drawer (Esc)"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#fee2e2';
                e.currentTarget.style.color = '#ef4444';
                e.currentTarget.style.borderColor = '#fca5a5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.color = '#64748b';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DRAWER SCROLLABLE BODY */}
        {/* ========================================================================= */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 24px',
          }}
        >
          <TaskforceMemberDashboard
            key={memberId || 'dashboard'}
            initialMemberId={memberId}
            onAssignTaskToMember={onAssignTask}
            onOpenTaskDetail={onOpenTaskDetail}
          />
        </div>
      </div>
    </div>
  );
};

export default TaskforceMemberDrawer;
