namespace BilaTraining.Application.Features.Reports.Dtos;

public sealed record SessionOverviewSummaryDto(
    int Total,
    int Planned,
    int Completed,
    int Cancelled,
    int NoShow
);
