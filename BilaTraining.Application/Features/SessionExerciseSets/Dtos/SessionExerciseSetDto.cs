namespace BilaTraining.Application.Features.SessionExerciseSets.Dtos;

public sealed record SessionExerciseSetDto(
    Guid Id,
    Guid SessionExerciseId,
    int SetNumber,
    int? Repetitions,
    decimal? Weight,
    string? WeightUnit,
    string? Notes
);
