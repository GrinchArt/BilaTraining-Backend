using BilaTraining.Domain.Common;
using BilaTraining.Domain.Enums;

namespace BilaTraining.Domain.Entities;

public sealed class Session : AuditableEntity
{
    public Guid UserId { get; private set; }
    public Guid WorkspaceId { get; private set; }
    public Guid ClientId { get; private set; }

    public string? Notes { get; private set; }

    public DateTime StartAtUtc { get; private set; }
    public DateTime EndAtUtc { get; private set; }

    public SessionStatus Status { get; private set; } = SessionStatus.Planned;

    private Session() { }

    public Session(Guid userId, Guid workspaceId, Guid clientId, DateTime startAtUtc, DateTime endAtUtc, string? notes = null)
    {
        UserId = userId;
        Reassign(workspaceId, clientId);
        UpdateDetails(startAtUtc, endAtUtc, notes);
    }

    public void Reschedule(DateTime startAtUtc, DateTime endAtUtc)
    {
        if (endAtUtc <= startAtUtc)
            throw new ArgumentException("EndAtUtc must be greater than StartAtUtc.");

        StartAtUtc = startAtUtc;
        EndAtUtc = endAtUtc;
        MarkUpdated();
    }

    public void UpdateNotes(string? notes)
    {
        Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();
        MarkUpdated();
    }

    public void Reassign(Guid workspaceId, Guid clientId)
    {
        WorkspaceId = workspaceId;
        ClientId = clientId;
        MarkUpdated();
    }

    public void UpdateDetails(DateTime startAtUtc, DateTime endAtUtc, string? notes)
    {
        Reschedule(startAtUtc, endAtUtc);
        Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();
        MarkUpdated();
    }

    public void SetStatus(SessionStatus status)
    {
        Status = status;
        MarkUpdated();
    }

    public void MarkCompleted()
    {
        Status = SessionStatus.Completed;
        MarkUpdated();
    }

    public void Cancel()
    {
        Status = SessionStatus.Cancelled;
        MarkUpdated();
    }

    public void MarkNoShow()
    {
        Status = SessionStatus.NoShow;
        MarkUpdated();
    }
}
