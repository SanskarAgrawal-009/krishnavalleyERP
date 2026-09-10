import { useState, useEffect, useRef, useCallback } from 'react';
import { leadService } from '../services/leadService.js';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Synthesize a gentle, professional dual-tone notification chime using Web Audio API
 */
const playChimeSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    // First tone (D5 - 587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain1.gain.setValueAtTime(0.12, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.5);

    // Second tone (A5 - 880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
    gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.7);
  } catch (e) {
    // AudioContext autoplay restrictions or unsupported
    console.warn('Audio chime could not play:', e);
  }
};

/**
 * Trigger system desktop notification if permission granted
 */
const triggerDesktopNotification = (title, body, onClick) => {
  try {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      const notif = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'krishna-valley-task-reminder'
      });
      if (onClick) notif.onclick = onClick;
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  } catch (e) {
    console.warn('Desktop notification error:', e);
  }
};

export const useReminderAlerts = () => {
  const { user } = useAuth();
  const [activeReminders, setActiveReminders] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [lastChimedId, setLastChimedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const isFetchingRef = useRef(false);

  const fetchDueReminders = useCallback(async () => {
    if (!user || isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      setLoading(true);
      const res = await leadService.getDueReminders();
      if (res && res.success && res.data) {
        const { upcoming30Min = [], upcoming10Min = [], overdue = [] } = res.data;
        const upcoming = upcoming30Min.length > 0 ? upcoming30Min : upcoming10Min;
        // Prioritize upcoming 30-min alerts, then overdue
        const combined = [...upcoming, ...overdue];
        setActiveReminders(combined);

        // Check if there is a fresh reminder that needs sound alert
        const newest30Min = upcoming.find(r => (r.isDueIn30Min || r.isDueIn10Min) && !dismissedIds.has(r.id));
        if (newest30Min && newest30Min.id !== lastChimedId) {
          setLastChimedId(newest30Min.id);
          playChimeSound();
          triggerDesktopNotification(
            `⏰ 30-Min Reminder: ${newest30Min.leadName}`,
            `Upcoming ${newest30Min.mode?.toUpperCase()} scheduled in ${newest30Min.minutesRemaining} mins.`
          );
        }
      }
    } catch (err) {
      console.warn('Error polling due reminders:', err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [user, dismissedIds, lastChimedId]);

  // Initial poll + recurring 45-second ticker
  useEffect(() => {
    if (!user) return;
    fetchDueReminders();

    const interval = setInterval(() => {
      fetchDueReminders();
    }, 45000);

    const handleFocus = () => fetchDueReminders();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, fetchDueReminders]);

  // Request desktop notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const dismissReminder = (id) => {
    setDismissedIds(prev => new Set([...prev, id]));
  };

  const snoozeReminder = async (item, minutes = 5) => {
    try {
      await leadService.snoozeReminder({
        leadId: item.leadId,
        followUpId: item.type === 'follow_up' ? item.id : null,
        siteVisitId: item.type === 'site_visit' ? item.id : null,
        snoozeMinutes: minutes
      });
      dismissReminder(item.id);
      fetchDueReminders();
    } catch (err) {
      console.error('Error snoozing reminder:', err);
    }
  };

  // Filter out dismissed items for display (scheduled within 30 minutes or overdue)
  const visibleReminders = activeReminders.filter(r => !dismissedIds.has(r.id) && (r.isDueIn30Min || r.isDueIn10Min));

  return {
    allReminders: activeReminders,
    visibleReminders,
    activeAlert: visibleReminders[0] || null,
    dismissReminder,
    snoozeReminder,
    refreshReminders: fetchDueReminders,
    loading
  };
};

export default useReminderAlerts;
