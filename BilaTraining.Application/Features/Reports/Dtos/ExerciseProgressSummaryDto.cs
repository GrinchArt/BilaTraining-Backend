namespace BilaTraining.Application.Features.Reports.Dtos;

public sealed record ExerciseProgressSummaryDto(
    int CompletedSessions,
    int TotalSets,
    int TotalRepetitions,
    decimal TotalVolume,
    decimal MaxWeight
);
