namespace BilaTraining.Application.Features.Exercises.Dtos;

public sealed record ExerciseDto(
    Guid Id,
    string Name,
    string? Category,
    string? Notes
);
