/**
 * Sync customer account directly to Laravel backend database at http://192.168.1.3:8081/customers
 */
export async function syncCustomerToBackend(email: string, name?: string, avatar?: string): Promise<boolean> {
  if (!email || email === 'undefined' || email.includes('Google User')) return false;
  
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name || cleanEmail.split('@')[0];
  const payload = JSON.stringify({
    email: cleanEmail,
    name: cleanName,
    avatar: avatar || null,
  });

  const urlsToTry = Array.from(new Set([
    process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.3:8081',
    'http://192.168.1.3:8081',
    'http://localhost:8081',
    'http://127.0.0.1:8081',
  ]));

  for (const baseUrl of urlsToTry) {
    try {
      console.log(`[SyncCustomer] Syncing customer to ${baseUrl}/api/v1/sync-customer...`);
      const res = await fetch(`${baseUrl}/api/v1/sync-customer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: payload,
      });

      if (res.ok) {
        const json = await res.json();
        console.log('[SyncCustomer] Database Sync Successful:', json);
        return true;
      }
    } catch (err) {
      console.warn(`[SyncCustomer] Failed to connect to ${baseUrl}:`, err);
    }
  }

  console.error('[SyncCustomer] All database sync attempts failed!');
  return false;
}
