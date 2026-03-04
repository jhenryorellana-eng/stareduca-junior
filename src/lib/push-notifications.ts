const NOTIFICATION_API_URL = process.env.NOTIFICATION_API_URL || '';
const NOTIFICATION_API_KEY = process.env.NOTIFICATION_API_KEY || '';

/**
 * Sends an individual push notification via Hub Central's Edge Function.
 * Uses skip_db_insert: true because mini-apps handle their own notification DB records.
 */
export async function sendIndividualPush(
  profileId: string,
  type: string,
  title: string,
  message: string,
  data?: Record<string, unknown>
): Promise<void> {
  if (!NOTIFICATION_API_URL || !NOTIFICATION_API_KEY) return;
  try {
    await fetch(NOTIFICATION_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': NOTIFICATION_API_KEY,
      },
      body: JSON.stringify({
        profile_id: profileId,
        type,
        title,
        message,
        data,
        skip_db_insert: true,
      }),
    });
  } catch (error) {
    console.error('[Push] Individual push error:', error);
  }
}
