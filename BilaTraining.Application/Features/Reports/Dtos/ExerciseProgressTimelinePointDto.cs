namespace BilaTraining.Application.Features.Reports.Dtos;

public sealed record ExerciseProgressTimelinePointDto(
    DateOnly Date,
    int CompletedSessions,
    int TotalSets,
    int TotalRepetitions,
    decimal TotalVolume,
    decimal MaxWeight
);
