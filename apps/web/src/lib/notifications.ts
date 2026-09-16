import { LocalNotifications } from '@capacitor/local-notifications';

export async function setupNotifications() {
  await LocalNotifications.registerActionTypes({
    types: [
      {
        id: 'TASK_ACTIONS',
        actions: [
          {
            id: 'mark_done',
            title: 'Mark Done'
          }
        ]
      },
      {
        id: 'BLOCK_ACTIONS',
        actions: [
          {
            id: 'start_block',
            title: 'Start Now'
          }
        ]
      }
    ]
  });

  LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
    console.log('Notification action performed', notificationAction);
    const { actionId, notification } = notificationAction;
    const { extra } = notification;

    if (actionId === 'mark_done' && extra?.taskId) {
      // We will dispatch a custom event to handled by our UI/Hooks
      window.dispatchEvent(new CustomEvent('notification-action', {
        detail: { type: 'mark_task_done', taskId: extra.taskId }
      }));
    } else if (actionId === 'start_block' && extra?.blockId) {
      window.dispatchEvent(new CustomEvent('notification-action', {
        detail: { type: 'start_block', blockId: extra.blockId }
      }));
    } else if (actionId === 'tap') {
       // Just opening the notification
       if (extra?.taskId) {
           window.dispatchEvent(new CustomEvent('notification-action', {
               detail: { type: 'open_task', taskId: extra.taskId }
           }));
       } else if (extra?.blockId) {
           window.dispatchEvent(new CustomEvent('notification-action', {
               detail: { type: 'open_block', blockId: extra.blockId }
           }));
       }
    }
  });
}

export async function requestNotificationPermissions() {
  const { display } = await LocalNotifications.requestPermissions();
  if (display === 'granted') {
     await setupNotifications();
  }
  return display === 'granted';
}

export async function scheduleNotification(title: string, body: string, id: number, scheduleAt: Date, type: 'TASK' | 'BLOCK' = 'TASK', extraId?: string) {
  await LocalNotifications.schedule({
    notifications: [
      {
        title,
        body,
        id,
        schedule: { at: scheduleAt },
        actionTypeId: type === 'TASK' ? 'TASK_ACTIONS' : 'BLOCK_ACTIONS',
        extra: type === 'TASK' ? { taskId: extraId } : { blockId: extraId },
      },
    ],
  });
}

export async function cancelNotification(id: number) {
  await LocalNotifications.cancel({ notifications: [{ id }] });
}
