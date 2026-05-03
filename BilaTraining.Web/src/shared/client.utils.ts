import type { Client } from './models';

export function formatClientName(client: Client): string {
  return [client.firstName, client.lastName].filter(Boolean).join(' ');
}

export function emptyClient(id: string): Client {
  return {
    id,
    firstName: 'Unknown',
    lastName: 'client',
    phone: null,
    email: null,
    notes: null,
  };
}
