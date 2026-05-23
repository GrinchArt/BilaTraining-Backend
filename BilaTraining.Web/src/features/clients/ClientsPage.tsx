import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../../auth';
import { useI18n } from '../../i18n';
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

const emptyForm: ClientFormState = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  notes: '',
};

export function ClientsPage() {
  const { apiBaseUrl, authenticatedFetch } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const loadClients = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
      const data = await getJson<Client[]>(`${apiBaseUrl}/clients${query}`, authenticatedFetch, t('clients.loadFailed'));
      setClients(data);
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, authenticatedFetch, search, t]);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  useEffect(() => {
    if (!openMenuId) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || target.closest('.data-table__menu')) {
        return;
      }

      setOpenMenuId(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenuId(null);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenuId]);

  const handleDelete = async (client: Client) => {
    setIsDeletingId(client.id);
    setOpenMenuId(null);
    setErrorMessage('');

    try {
      await sendVoid(`${apiBaseUrl}/clients/${client.id}`, 'DELETE', authenticatedFetch, t('clients.deleteFailed'));
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
          <p className="feature-page__eyebrow">{t('nav.clients')}</p>
          <h2>{t('clients.title')}</h2>
        </div>
      </div>

      {errorMessage ? <p className="feedback">{errorMessage}</p> : null}

      <div className="exercise-page__grid exercise-page__grid--single">
        <section className="card">
          <div className="exercise-page__section-header">
            <h3>{t('clients.list')}</h3>
            <div className="exercise-page__section-actions">
              <span className="exercise-page__count">{clients.length}</span>
              <button type="button" className="exercise-page__count-button" aria-label={t('clients.add')} onClick={() => navigate('/clients/new')}>
                +
              </button>
            </div>
          </div>

          <div className="field">
            <label htmlFor="client-search">{t('common.search')}</label>
            <input id="client-search" type="search" placeholder={t('clients.searchPlaceholder')} value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>

          {isLoading ? <p className="exercise-page__state">{t('clients.loading')}</p> : null}
          {!isLoading && clients.length === 0 ? (
            <p className="exercise-page__state">{search.trim() ? t('clients.emptySearch') : t('clients.empty')}</p>
          ) : null}
          {!isLoading && clients.length > 0 ? (
            <div className="data-table data-table--clients">
              <div className="data-table__header" aria-hidden="true">
                <span>{t('common.client')}</span>
                <span>{t('common.phone')}</span>
                <span>{t('common.email')}</span>
                <span>{t('common.notes')}</span>
                <span></span>
              </div>
              {clients.map((client) => (
                <article key={client.id} className="data-table__row">
                  <div className="data-table__cell" data-label={t('common.client')}>
                    <div className="data-table__primary">
                      <strong>{formatClientName(client)}</strong>
                    </div>
                  </div>
                  <div className="data-table__cell" data-label={t('common.phone')}>
                    <span className={client.phone ? 'data-table__mono' : 'exercise-item__muted'}>{client.phone ?? t('common.noPhone')}</span>
                  </div>
                  <div className="data-table__cell" data-label={t('common.email')}>
                    <span>{client.email ?? t('common.noEmail')}</span>
                  </div>
                  <div className="data-table__cell" data-label={t('common.notes')}>
                    <span className={client.notes ? undefined : 'exercise-item__muted'}>{client.notes ?? t('common.noNotes')}</span>
                  </div>
                  <div className="data-table__cell data-table__cell--actions">
                    <div className="data-table__menu">
                      <button
                        type="button"
                        className="data-table__menu-trigger"
                        aria-label={t('clients.openActions', { name: formatClientName(client) })}
                        aria-expanded={openMenuId === client.id}
                        onClick={() => setOpenMenuId((current) => (current === client.id ? null : client.id))}
                      >
                        ...
                      </button>
                      {openMenuId === client.id ? (
                        <div className="data-table__menu-popover">
                          <button
                            type="button"
                            className="data-table__menu-item"
                            onClick={() => {
                              setOpenMenuId(null);
                              navigate(`/clients/${client.id}/edit`);
                            }}
                          >
                            {t('common.edit')}
                          </button>
                          <button type="button" className="data-table__menu-item data-table__menu-item--danger" disabled={isDeletingId === client.id} onClick={() => void handleDelete(client)}>
                            {isDeletingId === client.id ? t('common.deleting') : t('common.delete')}
                          </button>
                        </div>
                      ) : null}
                    </div>
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

export function ClientFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { apiBaseUrl, authenticatedFetch } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId: string }>();
  const [form, setForm] = useState<ClientFormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(mode === 'edit');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (mode !== 'edit') {
      setForm(emptyForm);
      return;
    }

    let isActive = true;

    const loadClient = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const clients = await getJson<Client[]>(`${apiBaseUrl}/clients`, authenticatedFetch, t('clients.loadFailed'));

        if (!isActive) {
          return;
        }

        const client = clients.find((item) => item.id === clientId);

        if (!client) {
          setErrorMessage(t('clients.notFound'));
          return;
        }

        setForm({
          firstName: client.firstName,
          lastName: client.lastName ?? '',
          phone: client.phone ?? '',
          email: client.email ?? '',
          notes: client.notes ?? '',
        });
      } catch (error) {
        if (isActive) {
          setErrorMessage(toMessage(error));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadClient();

    return () => {
      isActive = false;
    };
  }, [apiBaseUrl, authenticatedFetch, clientId, mode, t]);

  const handleChange =
    (field: keyof ClientFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.firstName.trim()) {
      setErrorMessage(t('clients.firstNameRequired'));
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
      if (mode === 'edit' && clientId) {
        await sendJson(`${apiBaseUrl}/clients/${clientId}`, 'PUT', authenticatedFetch, payload, t('clients.updateFailed'));
      } else {
        await sendJson(`${apiBaseUrl}/clients`, 'POST', authenticatedFetch, payload, t('clients.createFailed'));
      }

      navigate('/clients');
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="exercise-page">
      <div className="exercise-page__header">
        <div>
          <p className="feature-page__eyebrow">{t('nav.clients')}</p>
          <h2>{mode === 'edit' ? t('clients.editTitle') : t('clients.addTitle')}</h2>
          <p>{mode === 'edit' ? t('clients.editDescription') : t('clients.addDescription')}</p>
        </div>
        <button type="button" className="button button--secondary" onClick={() => navigate('/clients')}>
          {t('common.back')}
        </button>
      </div>

      {errorMessage ? <p className="feedback">{errorMessage}</p> : null}

      <section className="card calendar-day-panel">
        {isLoading ? (
          <p className="exercise-page__state">{t('common.loadingForm')}</p>
        ) : (
          <form className="exercise-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="client-firstName">{t('common.firstName')}</label>
              <input id="client-firstName" type="text" value={form.firstName} onChange={handleChange('firstName')} />
            </div>

            <div className="field">
              <label htmlFor="client-lastName">{t('common.lastName')}</label>
              <input id="client-lastName" type="text" value={form.lastName} onChange={handleChange('lastName')} />
            </div>

            <div className="field">
              <label htmlFor="client-phone">{t('common.phone')}</label>
              <input id="client-phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={handleChange('phone')} />
            </div>

            <div className="field">
              <label htmlFor="client-email">{t('common.email')}</label>
              <input id="client-email" type="email" autoComplete="email" value={form.email} onChange={handleChange('email')} />
            </div>

            <div className="field">
              <label htmlFor="client-notes">{t('common.notes')}</label>
              <textarea id="client-notes" rows={4} value={form.notes} onChange={handleChange('notes')} />
            </div>

            <button className="submit-button" type="submit" disabled={isSaving}>
              {isSaving ? t('common.saving') : mode === 'edit' ? t('common.saveChanges') : t('clients.submitAdd')}
            </button>
          </form>
        )}
      </section>
    </section>
  );
}
