namespace BilaTraining.Application.Features.SessionExercises.Dtos;

public sealed record SessionExerciseDto(
    Guid Id,
    Guid SessionId,
    Guid ExerciseId,
    int SortOrder,
    string? Notes,
    DateTime CreatedAtUtc
);
