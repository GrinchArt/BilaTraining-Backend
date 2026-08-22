import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../../auth';
import { useI18n } from '../../i18n';
import { getJson, sendJson, sendVoid, toMessage } from '../../shared/api';
import { formatClientName } from '../../shared/client.utils';
import type { Client, CoachClientRelationshipStatus } from '../../shared/models';

type InvitationLink = {
  clientId: string;
  url: string;
  expiresAtUtc: string;
};

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
  const PAGE_SIZE = 25;
  const { apiBaseUrl, authenticatedFetch } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');
  const [invitationLink, setInvitationLink] = useState<InvitationLink | null>(null);
  const [isGeneratingInvitation, setIsGeneratingInvitation] = useState(false);
  const [isRevokingInvitation, setIsRevokingInvitation] = useState(false);

  const activeClient = useMemo(
    () => clients.find((client) => client.id === activeClientId) ?? null,
    [activeClientId, clients],
  );
  const totalPages = Math.max(Math.ceil(clients.length / PAGE_SIZE), 1);
  const pagedClients = useMemo(
    () => clients.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [clients, page],
  );

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

  useEffect(() => {
    if (!activeClientId) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveClientId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeClientId]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const handleDelete = async (client: Client) => {
    setIsDeletingId(client.id);
    setOpenMenuId(null);
    setActiveClientId((current) => (current === client.id ? null : current));
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

  const handleGenerateInvitation = async (client: Client) => {
    setIsGeneratingInvitation(true);
    setErrorMessage('');
    try {
      const response = await sendJson<{ token: string; expiresAtUtc: string }>(
        `${apiBaseUrl}/clients/${client.id}/invitation`,
        'POST',
        authenticatedFetch,
        {},
        t('invitation.generateFailed'),
      );

      if (response) {
        setInvitationLink({
          clientId: client.id,
          url: `${window.location.origin}/join/${encodeURIComponent(response.token)}`,
          expiresAtUtc: response.expiresAtUtc,
        });
      }
      await loadClients();
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsGeneratingInvitation(false);
    }
  };

  const handleRevokeInvitation = async (client: Client) => {
    setIsRevokingInvitation(true);
    setErrorMessage('');
    try {
      await sendVoid(
        `${apiBaseUrl}/clients/${client.id}/invitation`,
        'DELETE',
        authenticatedFetch,
        t('invitation.revokeFailed'),
      );
      setInvitationLink((current) => (current?.clientId === client.id ? null : current));
      await loadClients();
    } catch (error) {
      setErrorMessage(toMessage(error));
    } finally {
      setIsRevokingInvitation(false);
    }
  };

  const copyInvitation = async () => {
    if (!invitationLink) return;
    await navigator.clipboard.writeText(invitationLink.url);
  };

  const shareInvitation = async (client: Client) => {
    if (!invitationLink) return;
    if (navigator.share) {
      await navigator.share({
        title: t('invitation.shareTitle'),
        text: t('invitation.shareText', { name: formatClientName(client) }),
        url: invitationLink.url,
      });
      return;
    }

    await copyInvitation();
  };

  return (
    <section className="exercise-page clients-page">
      <div className="exercise-page__header clients-page__header">
        <div>
          <h2>{t('clients.title')}</h2>
        </div>
        <div className="exercise-page__section-actions">
          <span className="exercise-page__count">{clients.length}</span>
          <button type="button" className="exercise-page__count-button" aria-label={t('clients.add')} onClick={() => navigate('/clients/new')}>
            +
          </button>
        </div>
      </div>

      {errorMessage ? <p className="feedback">{errorMessage}</p> : null}

      <div className="exercise-page__grid exercise-page__grid--single">
        <section className="clients-panel">
          <div className="field">
            <label htmlFor="client-search">{t('common.search')}</label>
            <input id="client-search" type="search" placeholder={t('clients.searchPlaceholder')} value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>

          {isLoading ? <p className="exercise-page__state">{t('clients.loading')}</p> : null}
          {!isLoading && clients.length === 0 ? (
            <p className="exercise-page__state">{search.trim() ? t('clients.emptySearch') : t('clients.empty')}</p>
          ) : null}
          {!isLoading && clients.length > 0 ? (
            <>
              <div className="client-list">
                {pagedClients.map((client) => (
                  <article key={client.id} className="client-list__item">
                    <button type="button" className="client-list__trigger" onClick={() => setActiveClientId(client.id)}>
                      <div className="client-list__primary">
                        <strong>{formatClientName(client)}</strong>
                        <span className={`relationship-badge relationship-badge--${client.relationshipStatus}`}>
                          {relationshipStatusLabel(client.relationshipStatus, t)}
                        </span>
                      </div>
                    </button>
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
                  </article>
                ))}
              </div>

              {clients.length > PAGE_SIZE ? (
                <div className="list-pagination">
                  <button type="button" className="button button--ghost button--compact" onClick={() => setPage((current) => Math.max(current - 1, 1))} disabled={page === 1}>
                    {t('common.prev')}
                  </button>
                  <span className="list-pagination__label">
                    {page} / {totalPages}
                  </span>
                  <button type="button" className="button button--ghost button--compact" onClick={() => setPage((current) => Math.min(current + 1, totalPages))} disabled={page === totalPages}>
                    {t('common.next')}
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      </div>

      {activeClient ? (
        <div className="client-modal" role="dialog" aria-modal="true" aria-labelledby="client-modal-title">
          <button type="button" className="client-modal__scrim" aria-label={t('common.close')} onClick={() => setActiveClientId(null)} />

          <section className="card client-modal__card">
            <div className="client-modal__header">
              <div>
                <h3 id="client-modal-title">{formatClientName(activeClient)}</h3>
              </div>

              <button type="button" className="client-modal__close" aria-label={t('common.close')} onClick={() => setActiveClientId(null)}>
                x
              </button>
            </div>

            <div className="client-modal__body">
              <div className="client-modal__field">
                <p className="client-modal__label">{t('common.phone')}</p>
                <p className={activeClient.phone ? 'data-table__mono' : 'exercise-item__muted'}>{activeClient.phone ?? t('common.noPhone')}</p>
              </div>

              <div className="client-modal__field">
                <p className="client-modal__label">{t('common.email')}</p>
                <p>{activeClient.email ?? t('common.noEmail')}</p>
              </div>

              <div className="client-modal__field">
                <p className="client-modal__label">{t('common.notes')}</p>
                <p className={activeClient.notes ? undefined : 'exercise-item__muted'}>{activeClient.notes ?? t('common.noNotes')}</p>
              </div>

              <div className="client-modal__field">
                <p className="client-modal__label">{t('invitation.relationshipStatus')}</p>
                <span className={`relationship-badge relationship-badge--${activeClient.relationshipStatus}`}>
                  {relationshipStatusLabel(activeClient.relationshipStatus, t)}
                </span>
              </div>

              {activeClient.relationshipStatus === 2 ? (
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => navigate(`/clients/${activeClient.id}/measurements`)}
                >
                  {t('measurements.openClientMeasurements')}
                </button>
              ) : null}

              <div className="client-invitation-panel">
                <h4>{t('invitation.trainerPanelTitle')}</h4>
                <p>{t('invitation.trainerPanelDescription')}</p>

                {invitationLink?.clientId === activeClient.id ? (
                  <div className="client-invitation-panel__link">
                    <input type="text" readOnly value={invitationLink.url} aria-label={t('invitation.linkLabel')} />
                    <small>
                      {t('invitation.validUntil', {
                        date: new Date(invitationLink.expiresAtUtc).toLocaleDateString(),
                      })}
                    </small>
                    <div className="client-invitation-panel__actions">
                      <button type="button" className="button" onClick={() => void copyInvitation()}>
                        {t('invitation.copy')}
                      </button>
                      <button type="button" className="button button--ghost" onClick={() => void shareInvitation(activeClient)}>
                        {t('invitation.share')}
                      </button>
                    </div>
                  </div>
                ) : null}

                {activeClient.relationshipStatus !== 2 && activeClient.relationshipStatus !== 3 ? (
                  <button
                    type="button"
                    className="button"
                    disabled={isGeneratingInvitation}
                    onClick={() => void handleGenerateInvitation(activeClient)}
                  >
                    {isGeneratingInvitation
                      ? t('invitation.generating')
                      : activeClient.relationshipStatus === 1
                        ? t('invitation.regenerate')
                        : t('invitation.generate')}
                  </button>
                ) : (
                  <p className="client-invitation-panel__linked">{t('invitation.alreadyLinked')}</p>
                )}

                {activeClient.relationshipStatus === 1 ? (
                  <button
                    type="button"
                    className="button button--danger"
                    disabled={isRevokingInvitation}
                    onClick={() => void handleRevokeInvitation(activeClient)}
                  >
                    {isRevokingInvitation ? t('invitation.revoking') : t('invitation.revoke')}
                  </button>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function relationshipStatusLabel(
  status: CoachClientRelationshipStatus,
  t: ReturnType<typeof useI18n>['t'],
) {
  const keys = {
    0: 'relationship.managed',
    1: 'relationship.pending',
    2: 'relationship.active',
    3: 'relationship.paused',
    4: 'relationship.ended',
  } as const;
  return t(keys[status]);
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
    <section className="exercise-page entity-form-page">
      <button type="button" className="button button--ghost page-back-button" onClick={() => navigate('/clients')}>
        {t('common.back')}
      </button>

      <div className="exercise-page__header entity-form-page__header">
        <div>
          <h2>{mode === 'edit' ? t('clients.editTitle') : t('clients.addTitle')}</h2>
        </div>
      </div>

      {errorMessage ? <p className="feedback">{errorMessage}</p> : null}

      {isLoading ? (
        <p className="exercise-page__state">{t('common.loadingForm')}</p>
      ) : (
        <form className="exercise-form entity-form-page__form" onSubmit={handleSubmit}>
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
  );
}
