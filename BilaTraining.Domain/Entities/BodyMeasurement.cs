using BilaTraining.Domain.Common;

namespace BilaTraining.Domain.Entities;

public sealed class BodyMeasurement : AuditableEntity
{
    public Guid UserId { get; private set; }
    public DateOnly RecordedOn { get; private set; }
    public decimal? WeightKg { get; private set; }
    public decimal? HeightCm { get; private set; }
    public decimal? BodyFatPercent { get; private set; }
    public decimal? NeckCm { get; private set; }
    public decimal? ChestCm { get; private set; }
    public decimal? WaistCm { get; private set; }
    public decimal? HipsCm { get; private set; }
    public decimal? BicepsCm { get; private set; }
    public decimal? ThighCm { get; private set; }
    public decimal? CalfCm { get; private set; }
    public string? Notes { get; private set; }

    private BodyMeasurement() { }

    public BodyMeasurement(
        Guid userId,
        DateOnly recordedOn,
        decimal? weightKg,
        decimal? heightCm,
        decimal? bodyFatPercent,
        decimal? neckCm,
        decimal? chestCm,
        decimal? waistCm,
        decimal? hipsCm,
        decimal? bicepsCm,
        decimal? thighCm,
        decimal? calfCm,
        string? notes)
    {
        UserId = userId;
        Update(recordedOn, weightKg, heightCm, bodyFatPercent, neckCm, chestCm,
            waistCm, hipsCm, bicepsCm, thighCm, calfCm, notes);
    }

    public void Update(
        DateOnly recordedOn,
        decimal? weightKg,
        decimal? heightCm,
        decimal? bodyFatPercent,
        decimal? neckCm,
        decimal? chestCm,
        decimal? waistCm,
        decimal? hipsCm,
        decimal? bicepsCm,
        decimal? thighCm,
        decimal? calfCm,
        string? notes)
    {
        if (recordedOn == default)
            throw new ArgumentException("Measurement date is required.", nameof(recordedOn));

        ValidateRange(weightKg, 1, 1000, nameof(weightKg));
        ValidateRange(heightCm, 30, 300, nameof(heightCm));
        ValidateRange(bodyFatPercent, 0, 100, nameof(bodyFatPercent));
        ValidateRange(neckCm, 1, 500, nameof(neckCm));
        ValidateRange(chestCm, 1, 500, nameof(chestCm));
        ValidateRange(waistCm, 1, 500, nameof(waistCm));
        ValidateRange(hipsCm, 1, 500, nameof(hipsCm));
        ValidateRange(bicepsCm, 1, 500, nameof(bicepsCm));
        ValidateRange(thighCm, 1, 500, nameof(thighCm));
        ValidateRange(calfCm, 1, 500, nameof(calfCm));

        if (new[] { weightKg, heightCm, bodyFatPercent, neckCm, chestCm, waistCm,
                hipsCm, bicepsCm, thighCm, calfCm }.All(value => !value.HasValue))
            throw new ArgumentException("At least one body metric is required.");

        var normalizedNotes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();
        if (normalizedNotes?.Length > 1000)
            throw new ArgumentException("Notes cannot exceed 1000 characters.", nameof(notes));

        RecordedOn = recordedOn;
        WeightKg = weightKg;
        HeightCm = heightCm;
        BodyFatPercent = bodyFatPercent;
        NeckCm = neckCm;
        ChestCm = chestCm;
        WaistCm = waistCm;
        HipsCm = hipsCm;
        BicepsCm = bicepsCm;
        ThighCm = thighCm;
        CalfCm = calfCm;
        Notes = normalizedNotes;
        MarkUpdated();
    }

    private static void ValidateRange(decimal? value, decimal min, decimal max, string field)
    {
        if (value.HasValue && (value.Value < min || value.Value > max))
            throw new ArgumentOutOfRangeException(field, $"{field} must be between {min} and {max}.");
    }
}
