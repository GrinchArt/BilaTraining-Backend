namespace BilaTraining.Application.Features.Reports.Dtos;

public sealed record SessionOverviewPeriodDto(
    string Period,
    DateOnly AnchorDate,
    DateOnly StartDate,
    DateOnly EndDate,
    DateOnly PreviousAnchorDate,
    DateOnly NextAnchorDate,
    string TimeZone
);
