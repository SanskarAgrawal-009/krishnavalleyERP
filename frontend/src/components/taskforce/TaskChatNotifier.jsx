import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { taskService } from '../../services/taskService.js';
import { TaskDetailModal } from './TaskDetailModal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  MessageSquare,
  X,
  ExternalLink,
  ChevronRight,
  Sparkles,
  User,
  Zap,
} from 'lucide-react';

/**
 * Synthesizes a soft, pleasant notification chime for new task chats
 */
const playChatChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // D5 -> A5 pleasant chord tone
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    // Audio autoplay restrictions gracefully handled
  }
};

/**
 * Triggers standard browser desktop notification if permitted
 */
const triggerDesktopChatNotification = (title, body, onClick) => {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notif = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: `task-chat-${Date.now()}`,
      });
      if (onClick) {
        notif.onclick = () => {
          window.focus();
          onClick();
          notif.close();
        };
      }
    }
  } catch (e) {
    console.warn('Desktop notification error:', e);
  }
};

export const TaskChatNotifier = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activePopups, setActivePopups] = useState([]);
  const [selectedTaskIdForModal, setSelectedTaskIdForModal] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const lastCheckedRef = useRef(Date.now() - 30 * 1000); // look back 30s initially
  const seenCommentIdsRef = useRef(new Set());
  const isPollingRef = useRef(false);

  // Request browser notification permissions on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Listen for global open task chat events (e.g. from Bell alert box or URLs)
  useEffect(() => {
    const handleOpenChatEvent = (e) => {
      const taskId = e.detail?.taskId;
      if (taskId) {
        setSelectedTaskIdForModal(taskId);
        setIsModalOpen(true);
      }
    };

    window.addEventListener('taskforceOpenTaskChat', handleOpenChatEvent);
    return () => window.removeEventListener('taskforceOpenTaskChat', handleOpenChatEvent);
  }, []);

  const handleOpenTaskChat = (taskId) => {
    // Dismiss any popup for this task
    setActivePopups((prev) => prev.filter((p) => p.taskId?.toString() !== taskId?.toString()));

    if (location.pathname === '/taskforce') {
      // If already on taskforce page, dispatch event so TaskforcePage handles it smoothly
      window.dispatchEvent(
        new CustomEvent('taskforceOpenTaskChat', {
          detail: { taskId },
        })
      );
    }

    // Open global modal directly in place on any page!
    setSelectedTaskIdForModal(taskId);
    setIsModalOpen(true);
  };

  const dismissPopup = (commentId, e) => {
    if (e) e.stopPropagation();
    setActivePopups((prev) => prev.filter((p) => p.commentId !== commentId));
  };

  // Poll for new task chat comments
  const checkRecentChats = useCallback(async () => {
    if (!user || isPollingRef.current) return;
    isPollingRef.current = true;

    try {
      const sinceTime = lastCheckedRef.current;
      const res = await taskService.getRecentChats(sinceTime);

      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        const newChats = [];

        res.data.forEach((chat) => {
          const cId = chat.commentId?.toString() || `${chat.taskId}-${chat.createdAt}`;
          const senderId = chat.sender?._id?.toString() || chat.sender?.toString();
          const currentUserId = user?.id || user?._id?.toString();

          // Only alert if not already seen AND not sent by the current user
          if (!seenCommentIdsRef.current.has(cId)) {
            seenCommentIdsRef.current.add(cId);

            if (senderId && senderId !== currentUserId) {
              newChats.push(chat);
            }
          }
        });

        if (newChats.length > 0) {
          playChatChime();

          // Push to active popups
          setActivePopups((prev) => {
            const combined = [...newChats, ...prev];
            // Keep at most 3 popups visible to prevent clutter
            return combined.slice(0, 3);
          });

          // Show desktop notification for the newest message
          const latest = newChats[0];
          const senderName = latest.sender
            ? `${latest.sender.firstName || ''} ${latest.sender.lastName || ''}`.trim() || latest.sender.username
            : 'Team Member';

          triggerDesktopChatNotification(
            `💬 New Message on ${latest.taskCode || 'Task'}`,
            `${senderName}: "${latest.message.slice(0, 100)}"`,
            () => handleOpenTaskChat(latest.taskId)
          );
        }
      }

      lastCheckedRef.current = Date.now();
    } catch (err) {
      console.warn('Chat notification poll warning:', err);
    } finally {
      isPollingRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Check immediately, then every 8 seconds
    checkRecentChats();
    const interval = setInterval(checkRecentChats, 8000);

    const handleFocus = () => checkRecentChats();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, checkRecentChats]);

  // Auto-dismiss individual popups after 9 seconds
  useEffect(() => {
    if (activePopups.length === 0) return;

    const timer = setTimeout(() => {
      setActivePopups((prev) => prev.slice(0, -1));
    }, 9000);

    return () => clearTimeout(timer);
  }, [activePopups]);

  return (
    <>
      {/* 1. FLOATING NOTIFICATION POP-UPS CONTAINER (BOTTOM-RIGHT) */}
      {activePopups.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            maxWidth: '380px',
            width: 'calc(100vw - 32px)',
            pointerEvents: 'none',
          }}
        >
          {activePopups.map((chat) => {
            const senderName = chat.sender
              ? `${chat.sender.firstName || ''} ${chat.sender.lastName || ''}`.trim() || chat.sender.username
              : 'Team Member';

            const isMD = chat.isMDNote || chat.messageType === 'md_note';

            return (
              <div
                key={chat.commentId}
                onClick={() => handleOpenTaskChat(chat.taskId)}
                style={{
                  pointerEvents: 'auto',
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: isMD ? '2px solid #ca8a04' : '1.5px solid #0284c7',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.18)',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  animation: 'slideInUp 0.25s ease-out',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Header: Avatar, Sender, TaskCode, Close */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: isMD ? '#fef3c7' : '#e0f2fe',
                        color: isMD ? '#b45309' : '#0284c7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '12px',
                        flexShrink: 0,
                      }}
                    >
                      {senderName?.[0] || 'U'}
                    </div>

                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                        {senderName}
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>
                        {chat.sender?.role ? `${chat.sender.role} • ` : ''}Just now
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: isMD ? '#fefce8' : '#f0f9ff',
                        color: isMD ? '#ca8a04' : '#0284c7',
                        border: isMD ? '1px solid #fde68a' : '1px solid #bae6fd',
                      }}
                    >
                      {chat.taskCode || 'TASK'}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => dismissPopup(chat.commentId, e)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Task Title */}
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Directive: {chat.taskTitle}
                </div>

                {/* Message Body */}
                <div
                  style={{
                    fontSize: '12px',
                    color: '#1e293b',
                    backgroundColor: isMD ? '#fffbeb' : '#f8fafc',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    lineHeight: '1.4',
                    maxHeight: '60px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    borderLeft: isMD ? '3px solid #ca8a04' : '3px solid #0284c7',
                  }}
                >
                  "{chat.message}"
                </div>

                {/* Click to open action hint */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: isMD ? '#ca8a04' : '#0284c7', marginTop: '2px' }}>
                  <span>Open &amp; Reply</span>
                  <ChevronRight size={13} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. GLOBAL TASK DETAIL MODAL (Directly on Chat Tab) */}
      {selectedTaskIdForModal && (
        <TaskDetailModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedTaskIdForModal(null);
          }}
          taskId={selectedTaskIdForModal}
          initialTab="chat"
          onTaskUpdated={() => {
            window.dispatchEvent(new CustomEvent('taskforceTaskUpdated'));
          }}
        />
      )}
    </>
  );
};

export default TaskChatNotifier;
