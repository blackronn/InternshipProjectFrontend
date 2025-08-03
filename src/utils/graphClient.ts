import { msalApp } from '@/main';
import apiClient from '@/utils/apiClients';

export async function fetchJobTitle(): Promise<string> {
  const account = msalApp.getActiveAccount();
  if (!account) throw new Error('No active account');

  const email = account.username;

  const result = await msalApp.acquireTokenSilent({
    account,
    scopes: ['User.Read'],
  });

  const resp = await apiClient.get(
    'https://graph.microsoft.com/v1.0/me?$select=jobTitle',
    { headers: { Authorization: `Bearer ${result.accessToken}` } }
  );
  console.log('GRAPH jobTitle:', resp.data.jobTitle);
  return resp.data.jobTitle || '';
}
