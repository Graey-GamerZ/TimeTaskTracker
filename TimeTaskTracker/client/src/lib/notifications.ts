import { Task } from "@shared/schema";

export class NotificationService {
  private permissionGranted = false;
  private scheduledNotifications = new Map<number | string, number>();

  constructor() {
    this.checkPermission();
  }

  private checkPermission() {
    if ("Notification" in window) {
      console.log('Checking notification permission:', Notification.permission);
      this.permissionGranted = Notification.permission === "granted";
      
      // Additional debugging
      if (Notification.permission === "denied") {
        console.warn('Notifications are blocked by the user or browser settings');
      } else if (Notification.permission === "default") {
        console.log('Notification permission not yet requested');
      }
    } else {
      console.error('Notifications not supported in this browser');
    }
  }

  // Force refresh permission status
  refreshPermissionStatus() {
    this.checkPermission();
    return this.permissionGranted;
  }

  async requestPermission(): Promise<boolean> {
    console.log('NotificationService: requestPermission called');
    
    if (!("Notification" in window)) {
      console.warn("This browser does not support notifications");
      return false;
    }

    console.log('Current permission:', Notification.permission);

    if (Notification.permission === "granted") {
      this.permissionGranted = true;
      console.log('Permission already granted');
      return true;
    }

    if (Notification.permission === "denied") {
      console.log('Permission denied by user');
      return false;
    }

    try {
      console.log('Requesting permission...');
      const permission = await Notification.requestPermission();
      console.log('Permission response:', permission);
      
      this.permissionGranted = permission === "granted";
      this.checkPermission(); // Update internal state
      
      return this.permissionGranted;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  scheduleNotification(task: Task) {
    if (!this.permissionGranted) {
      return;
    }

    // Clear existing notifications for this task
    this.clearNotification(task.id);

    const now = new Date();
    const taskTime = new Date(task.scheduledDate);
    const timeDiff = taskTime.getTime() - now.getTime();

    // Skip if task is already past due
    if (timeDiff < 0) {
      return;
    }

    // Schedule notification 5 minutes before task time
    const reminderTime = Math.max(timeDiff - 5 * 60 * 1000, 0);
    if (reminderTime > 0) {
      const reminderTimeoutId = window.setTimeout(() => {
        this.showReminderNotification(task);
      }, reminderTime);
      this.scheduledNotifications.set(`${task.id}-reminder`, reminderTimeoutId);
    }

    // Schedule notification exactly at task time
    const exactTimeoutId = window.setTimeout(() => {
      this.showExactTimeNotification(task);
      this.scheduledNotifications.delete(task.id);
    }, timeDiff);

    this.scheduledNotifications.set(task.id, exactTimeoutId);
  }

  private showReminderNotification(task: Task) {
    if (!this.permissionGranted) {
      return;
    }

    const notification = new Notification(`📅 Task Reminder: ${task.title}`, {
      body: `Due in 5 minutes at ${new Date(task.scheduledDate).toLocaleTimeString()}\nPriority: ${task.priority.toUpperCase()} | Category: ${task.category}`,
      icon: "/favicon.ico",
      tag: `task-${task.id}-reminder`,
      requireInteraction: false,
      badge: "/favicon.ico",
      silent: false,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Play a sound notification
    this.playNotificationSound();

    // Auto-close after 10 seconds
    setTimeout(() => notification.close(), 10000);
  }

  private showExactTimeNotification(task: Task) {
    if (!this.permissionGranted) {
      return;
    }

    const notification = new Notification(`⏰ Task Due Now: ${task.title}`, {
      body: `Your task is due right now!\nPriority: ${task.priority.toUpperCase()} | Category: ${task.category}`,
      icon: "/favicon.ico",
      tag: `task-${task.id}-due`,
      requireInteraction: true,
      badge: "/favicon.ico",
      silent: false,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Play a sound notification
    this.playNotificationSound();

    // Auto-close after 20 seconds for due tasks
    setTimeout(() => notification.close(), 20000);
  }

  clearNotification(taskId: number) {
    // Clear exact time notification
    const timeoutId = this.scheduledNotifications.get(taskId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.scheduledNotifications.delete(taskId);
    }
    
    // Clear reminder notification
    const reminderTimeoutId = this.scheduledNotifications.get(`${taskId}-reminder`);
    if (reminderTimeoutId) {
      clearTimeout(reminderTimeoutId);
      this.scheduledNotifications.delete(`${taskId}-reminder`);
    }
  }

  clearAllNotifications() {
    this.scheduledNotifications.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.scheduledNotifications.clear();
  }

  get hasPermission() {
    return this.permissionGranted;
  }

  // Test desktop notification - force test even if permission seems denied
  testDesktopNotification() {
    console.log('Testing desktop notification...');
    console.log('Current Notification.permission:', Notification.permission);
    
    try {
      // First check if notifications are supported
      if (!("Notification" in window)) {
        console.error('Notifications not supported in this browser');
        return false;
      }

      // Check current permission status
      if (Notification.permission === "denied") {
        console.warn('Notifications are blocked. Please enable them in your browser settings.');
        alert('Notifications are blocked. Please click the lock icon in your browser address bar and allow notifications, then refresh the page.');
        return false;
      }

      if (Notification.permission === "default") {
        console.log('Requesting notification permission...');
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            this.testDesktopNotification();
          } else {
            console.warn('Notification permission denied');
            alert('Please allow notifications to receive task reminders.');
          }
        });
        return false;
      }

      console.log('Creating notification...');
      const notification = new Notification(`🔔 Desktop Notification Test`, {
        body: `Your desktop notifications are working perfectly!\nYou'll receive alerts for your scheduled tasks.`,
        icon: "/favicon.ico",
        tag: "test-notification",
        requireInteraction: false,
        badge: "/favicon.ico",
        silent: false,
      });

      console.log('Notification created successfully');

      notification.onshow = () => {
        console.log('Notification is now visible');
      };

      notification.onclick = () => {
        console.log('Notification clicked');
        window.focus();
        notification.close();
      };

      notification.onerror = (error) => {
        console.error('Notification error:', error);
        alert('Notification failed to show. Please check your browser notification settings.');
      };

      notification.onclose = () => {
        console.log('Notification closed');
      };

      // Play a sound notification
      this.playNotificationSound();

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);
      
      // If we get here, notifications actually work
      this.permissionGranted = true;
      console.log('Test notification sent successfully');
      return true;
    } catch (error) {
      console.error('Test notification failed:', error);
      alert(`Notification failed: ${error.message}. Please check your browser settings.`);
      return false;
    }
  }

  getScheduledNotificationCount() {
    return this.scheduledNotifications.size;
  }

  isTaskScheduled(taskId: number) {
    return this.scheduledNotifications.has(taskId) || this.scheduledNotifications.has(`${taskId}-reminder`);
  }

  private playNotificationSound() {
    // Create a simple beep sound for desktop notifications
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800; // Frequency in Hz
      gainNode.gain.value = 0.1; // Volume
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.3); // Play for 0.3 seconds
    } catch (error) {
      console.log('Audio notification not supported');
    }
  }
}

export const notificationService = new NotificationService();
