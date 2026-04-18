using BilaTraining.Domain.Common;

namespace BilaTraining.Domain.Entities;

public sealed class Exercise : AuditableEntity
{
    public Guid UserId { get; private set; }

    public string Name { get; private set; } = default!;
    public string? Category { get; private set; }
    public string? Notes { get; private set; }

    private Exercise() { }

    public Exercise(Guid userId, string name, string? category = null)
    {
        UserId = userId;
        UpdateDetails(name, category, null);
    }

    public void Rename(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Exercise name is required.", nameof(name));

        Name = name.Trim();
        MarkUpdated();
    }

    public void UpdateDetails(string name, string? category, string? notes)
    {
        Rename(name);
        Category = string.IsNullOrWhiteSpace(category) ? null : category.Trim();
        Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();
        MarkUpdated();
    }
}

