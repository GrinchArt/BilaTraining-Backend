using BilaTraining.Domain.Common;

namespace BilaTraining.Domain.Entities;

public sealed class Workspace : AuditableEntity
{
    public Guid UserId { get; private set; }

    public string Name { get; private set; } = default!;
    public string? Description { get; private set; }
    public string? ColorHex { get; private set; }

    private Workspace() { }

    public Workspace(Guid userId, string name, string? description = null, string? colorHex = null)
    {
        UserId = userId;
        Rename(name);
        UpdateDetails(description, colorHex);
    }

    public void Rename(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Workspace name is required.", nameof(name));

        Name = name.Trim();
        MarkUpdated();
    }

    public void UpdateDetails(string? description, string? colorHex)
    {
        Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        ColorHex = string.IsNullOrWhiteSpace(colorHex) ? null : colorHex.Trim();
        MarkUpdated();
    }
}

