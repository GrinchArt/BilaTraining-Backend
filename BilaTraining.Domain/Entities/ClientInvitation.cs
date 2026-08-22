using BilaTraining.Domain.Common;

namespace BilaTraining.Domain.Entities;

public sealed class ClientInvitation : Entity
{
    public Guid RelationshipId { get; private set; }
    public Guid CreatedByUserId { get; private set; }
    public string TokenHash { get; private set; } = default!;
    public DateTime ExpiresAtUtc { get; private set; }
    public DateTime CreatedAtUtc { get; private set; } = DateTime.UtcNow;
    public DateTime? AcceptedAtUtc { get; private set; }
    public DateTime? RevokedAtUtc { get; private set; }

    public bool IsUsable =>
        AcceptedAtUtc is null &&
        RevokedAtUtc is null &&
        ExpiresAtUtc > DateTime.UtcNow;

    private ClientInvitation() { }

    public ClientInvitation(
        Guid relationshipId,
        Guid createdByUserId,
        string tokenHash,
        DateTime expiresAtUtc)
    {
        if (string.IsNullOrWhiteSpace(tokenHash))
            throw new ArgumentException("Token hash is required.", nameof(tokenHash));

        if (expiresAtUtc <= DateTime.UtcNow)
            throw new ArgumentOutOfRangeException(nameof(expiresAtUtc));

        RelationshipId = relationshipId;
        CreatedByUserId = createdByUserId;
        TokenHash = tokenHash;
        ExpiresAtUtc = expiresAtUtc;
    }

    public void Accept()
    {
        if (!IsUsable)
            throw new InvalidOperationException("Invitation is not active.");

        AcceptedAtUtc = DateTime.UtcNow;
    }

    public void Revoke()
    {
        if (AcceptedAtUtc is null && RevokedAtUtc is null)
            RevokedAtUtc = DateTime.UtcNow;
    }
}
