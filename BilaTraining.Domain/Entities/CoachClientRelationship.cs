using BilaTraining.Domain.Common;
using BilaTraining.Domain.Enums;

namespace BilaTraining.Domain.Entities;

public sealed class CoachClientRelationship : AuditableEntity
{
    public Guid CoachUserId { get; private set; }
    public Guid ClientId { get; private set; }
    public CoachClientRelationshipStatus Status { get; private set; }
    public DateTime? StartedAtUtc { get; private set; }
    public DateTime? PausedAtUtc { get; private set; }
    public DateTime? EndedAtUtc { get; private set; }

    private CoachClientRelationship() { }

    public CoachClientRelationship(Guid coachUserId, Guid clientId)
    {
        CoachUserId = coachUserId;
        ClientId = clientId;
        Status = CoachClientRelationshipStatus.Managed;
    }

    public void StartInvitation()
    {
        if (Status is CoachClientRelationshipStatus.Active or CoachClientRelationshipStatus.Paused)
            throw new InvalidOperationException("An active relationship cannot be invited again.");

        Status = CoachClientRelationshipStatus.Pending;
        EndedAtUtc = null;
        MarkUpdated();
    }

    public void CancelInvitation()
    {
        if (Status != CoachClientRelationshipStatus.Pending)
            return;

        Status = CoachClientRelationshipStatus.Managed;
        MarkUpdated();
    }

    public void Activate()
    {
        Status = CoachClientRelationshipStatus.Active;
        StartedAtUtc ??= DateTime.UtcNow;
        PausedAtUtc = null;
        EndedAtUtc = null;
        MarkUpdated();
    }

    public void Pause()
    {
        if (Status != CoachClientRelationshipStatus.Active)
            throw new InvalidOperationException("Only an active relationship can be paused.");

        Status = CoachClientRelationshipStatus.Paused;
        PausedAtUtc = DateTime.UtcNow;
        MarkUpdated();
    }

    public void End()
    {
        Status = CoachClientRelationshipStatus.Ended;
        EndedAtUtc = DateTime.UtcNow;
        MarkUpdated();
    }
}
