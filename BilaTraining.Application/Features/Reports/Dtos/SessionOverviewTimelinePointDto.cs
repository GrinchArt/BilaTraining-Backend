namespace BilaTraining.Application.Features.Reports.Dtos;

public sealed record SessionOverviewTimelinePointDto(
    DateOnly Date,
    int Total,
    int Planned,
    int Completed,
    int Cancelled,
    int NoShow
);
