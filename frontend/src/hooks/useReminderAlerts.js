import { useState, useEffect, useRef, useCallback } from 'react';
import { leadService } from '../services/leadService.js';
import { taskforceMeetingService } from '../services/taskforceMeetingService.js';
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
      const [leadRes, meetingRes] = await Promise.allSettled([
        leadService.getDueReminders(),
        taskforceMeetingService.getMyUpcomingMeetings(),
      ]);

      let combined = [];
      let upcomingList = [];

      // 1. Process CRM / Site Visit / Follow-Up Reminders
      if (leadRes.status === 'fulfilled' && leadRes.value?.success && leadRes.value.data) {
        const { upcoming30Min = [], upcoming10Min = [], overdue = [] } = leadRes.value.data;
        const upcoming = upcoming30Min.length > 0 ? upcoming30Min : upcoming10Min;
        upcomingList.push(...upcoming);
        combined.push(...upcoming, ...overdue);
      }

      // 2. Process Taskforce Meeting Alarms (for meetings where user is attendee or organizer)
      if (meetingRes.status === 'fulfilled' && meetingRes.value?.success && Array.isArray(meetingRes.value.data)) {
        const meetings = meetingRes.value.data;
        meetings.forEach((m) => {
          const mins = m.minutesRemaining;
          // Filter to meetings happening today or starting soon (within next 60 mins or overdue up to 30 mins)
          if (m.isToday || (mins !== null && mins <= 60 && mins >= -30)) {
            const isDueIn30 = mins !== null && mins >= 0 && mins <= 30;
            const isDueIn10 = mins !== null && mins >= 0 && mins <= 10;
            const isOverdue = mins !== null && mins < 0;

            const mtgItem = {
              id: `meeting-${m._id}`,
              meetingId: m._id,
              type: 'meeting',
              mode: 'meeting',
              isMeeting: true,
              leadName: m.title,
              leadPhone: m.locationType === 'virtual' ? 'Virtual Link' : 'Site Office',
              unit: m.venue || m.locationDetails || 'Site Operations Room',
              venue: m.venue || m.locationDetails || 'Site Operations Room',
              handlingMemberName: m.organizerName || 'Organizer',
              scheduledTime: m.scheduledDate,
              startTime: m.startTime,
              minutesRemaining: mins ?? 0,
              isDueIn30Min: isDueIn30,
              isDueIn10Min: isDueIn10,
              isOverdue,
              notes: m.agenda || `Meeting Code: ${m.meetingCode || 'MTG'} • ${m.attendeesCount || 0} attendees`,
            };

            combined.push(mtgItem);
            if (isDueIn30 || isDueIn10 || m.isDueSoon) {
              upcomingList.push(mtgItem);
            }
          }
        });
      }

      setActiveReminders(combined);

      // Check if there is a fresh reminder (lead or meeting) that needs sound alert
      const freshAlert = upcomingList.find(
        (r) => (r.isDueIn30Min || r.isDueIn10Min || r.isMeeting) && !dismissedIds.has(r.id)
      );

      if (freshAlert && freshAlert.id !== lastChimedId) {
        setLastChimedId(freshAlert.id);
        playChimeSound();
        if (freshAlert.isMeeting) {
          triggerDesktopNotification(
            `Meeting Reminder: ${freshAlert.leadName}`,
            `Scheduled at ${freshAlert.startTime || '10:30'} • Venue: ${freshAlert.venue || 'Site Office'}`
          );
        } else {
          triggerDesktopNotification(
            `30-Min Reminder: ${freshAlert.leadName}`,
            `Upcoming ${freshAlert.mode?.toUpperCase()} scheduled in ${freshAlert.minutesRemaining} mins.`
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
