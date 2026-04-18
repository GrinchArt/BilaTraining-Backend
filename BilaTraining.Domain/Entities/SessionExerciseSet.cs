using BilaTraining.Domain.Common;

namespace BilaTraining.Domain.Entities;

public sealed class SessionExerciseSet : Entity
{
    public Guid SessionExerciseId { get; private set; }

    public int SetNumber { get; private set; }
    public int? Repetitions { get; private set; }
    public decimal? Weight { get; private set; }
    public string? WeightUnit { get; private set; }
    public string? Notes { get; private set; }

    private SessionExerciseSet() { }

    public SessionExerciseSet(Guid sessionExerciseId, int setNumber, int? repetitions, decimal? weight, string? weightUnit, string? notes = null)
    {
        SessionExerciseId = sessionExerciseId;
        UpdateDetails(setNumber, repetitions, weight, weightUnit, notes);
    }

    public void UpdateDetails(int setNumber, int? repetitions, decimal? weight, string? weightUnit, string? notes)
    {
        if (setNumber <= 0) throw new ArgumentOutOfRangeException(nameof(setNumber));
        if (repetitions is not null && repetitions <= 0) throw new ArgumentOutOfRangeException(nameof(repetitions));
        if (weight is not null && weight < 0) throw new ArgumentOutOfRangeException(nameof(weight));

        SetNumber = setNumber;
        Repetitions = repetitions;
        Weight = weight;
        WeightUnit = string.IsNullOrWhiteSpace(weightUnit) ? null : weightUnit.Trim();
        Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();
    }
}
