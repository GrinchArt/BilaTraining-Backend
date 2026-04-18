namespace BilaTraining.Domain.Entities;

public sealed class WorkspaceClient
{
    public Guid WorkspaceId { get; private set; }
    public Guid ClientId { get; private set; }
    public DateTime AddedAtUtc { get; private set; } = DateTime.UtcNow;

    private WorkspaceClient() { }

    public WorkspaceClient(Guid workspaceId, Guid clientId)
    {
        WorkspaceId = workspaceId;
        ClientId = clientId;
        AddedAtUtc = DateTime.UtcNow;
    }
}
