import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';

import { useAuth } from '../../auth';
import { getJson, sendJson, sendVoid, toMessage } from '../../shared/api';
import { formatClientName } from '../../shared/client.utils';
import type { Client } from '../../shared/models';

type ClientFormState = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  notes: string;
};

export function ClientsPage() {
  const { apiBaseUrl, authenticatedFetch } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClientFormState>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    notes: '',
  });

  const loadClients = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
      const data = await getJson<Client[]>(`${apiBaseUrl}/clients${query}`, authenticatedFetch, 'Failed to load clients.');
      setClients(data);
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, authenticatedFetch, search]);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      notes: '',
    });
  };

  const handleChange =
    (field: keyof ClientFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const handleEdit = (client: Client) => {
    setEditingId(client.id);
    setErrorMessage('');
    setForm({
      firstName: client.firstName,
      lastName: client.lastName ?? '',
      phone: client.phone ?? '',
      email: client.email ?? '',
      notes: client.notes ?? '',
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.firstName.trim()) {
      setErrorMessage('First name is required.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      notes: form.notes.trim() || null,
    };

    try {
      if (editingId) {
        await sendJson(`${apiBaseUrl}/clients/${editingId}`, 'PUT', authenticatedFetch, payload, 'Failed to update client.');
      } else {
        await sendJson(`${apiBaseUrl}/clients`, 'POST', authenticatedFetch, payload, 'Failed to create client.');
      }

      resetForm();
      await loadClients();
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (client: Client) => {
    setIsDeletingId(client.id);
    setErrorMessage('');

    try {
      await sendVoid(`${apiBaseUrl}/clients/${client.id}`, 'DELETE', authenticatedFetch, 'Failed to delete client.');

      if (editingId === client.id) {
        resetForm();
      }

      await loadClients();
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <section className="exercise-page">
      <div className="exercise-page__header">
        <div>
          <p className="feature-page__eyebrow">Clients</p>
          <h2>Clients</h2>
          <p>Add clients, update their contact details, and filter the list when you are working from a phone.</p>
        </div>
      </div>

      {errorMessage ? <p className="feedback">{errorMessage}</p> : null}

      <div className="exercise-page__grid">
        <section className="card">
          <div className="exercise-page__section-header">
            <h3>{editingId ? 'Edit client' : 'Add client'}</h3>
            {editingId ? (
              <button type="button" className="button button--secondary" onClick={resetForm}>
                Cancel
              </button>
            ) : null}
          </div>

          <form className="exercise-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="client-firstName">First name</label>
              <input id="client-firstName" type="text" value={form.firstName} onChange={handleChange('firstName')} />
            </div>

            <div className="field">
              <label htmlFor="client-lastName">Last name</label>
              <input id="client-lastName" type="text" value={form.lastName} onChange={handleChange('lastName')} />
            </div>

            <div className="field">
              <label htmlFor="client-phone">Phone</label>
              <input id="client-phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={handleChange('phone')} />
            </div>

            <div className="field">
              <label htmlFor="client-email">Email</label>
              <input id="client-email" type="email" autoComplete="email" value={form.email} onChange={handleChange('email')} />
            </div>

            <div className="field">
              <label htmlFor="client-notes">Notes</label>
              <textarea id="client-notes" rows={4} value={form.notes} onChange={handleChange('notes')} />
            </div>

            <button className="submit-button" type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : editingId ? 'Save changes' : 'Add client'}
            </button>
          </form>
        </section>

        <section className="card">
          <div className="exercise-page__section-header">
            <h3>Client list</h3>
            <span className="exercise-page__count">{clients.length}</span>
          </div>

          <div className="field">
            <label htmlFor="client-search">Search</label>
            <input id="client-search" type="search" placeholder="Name, email, or phone" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>

          {isLoading ? <p className="exercise-page__state">Loading clients...</p> : null}
          {!isLoading && clients.length === 0 ? (
            <p className="exercise-page__state">{search.trim() ? 'No clients match the current search.' : 'No clients yet.'}</p>
          ) : null}
          {!isLoading && clients.length > 0 ? (
            <div className="exercise-list">
              {clients.map((client) => (
                <article key={client.id} className="exercise-item">
                  <div className="exercise-item__content">
                    <div className="exercise-item__title-row">
                      <h4>{formatClientName(client)}</h4>
                    </div>

                    <div className="client-item__meta">
                      <span>{client.phone ?? 'No phone'}</span>
                      <span>{client.email ?? 'No email'}</span>
                    </div>

                    {client.notes ? <p>{client.notes}</p> : <p className="exercise-item__muted">No notes.</p>}
                  </div>

                  <div className="exercise-item__actions">
                    <button type="button" className="button button--secondary" onClick={() => handleEdit(client)}>
                      Edit
                    </button>
                    <button type="button" className="button button--danger" disabled={isDeletingId === client.id} onClick={() => void handleDelete(client)}>
                      {isDeletingId === client.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );
}
