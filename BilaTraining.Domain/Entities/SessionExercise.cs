using BilaTraining.Domain.Common;

namespace BilaTraining.Domain.Entities;

public sealed class SessionExercise : Entity
{
    public Guid SessionId { get; private set; }
    public Guid ExerciseId { get; private set; }

    public int SortOrder { get; private set; }
    public string? Notes { get; private set; }
    public DateTime CreatedAtUtc { get; private set; } = DateTime.UtcNow;

    private SessionExercise() { }

    public SessionExercise(Guid sessionId, Guid exerciseId, int sortOrder = 0, string? notes = null)
    {
        SessionId = sessionId;
        ExerciseId = exerciseId;
        UpdateDetails(sortOrder, notes);
    }

    public void UpdateDetails(int sortOrder, string? notes)
    {
        SortOrder = sortOrder;
        Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();
    }
}
