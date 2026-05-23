namespace BilaTraining.Application.Features.Reports.Dtos;

public sealed record SessionOverviewReportDto(
    SessionOverviewPeriodDto Period,
    SessionOverviewSummaryDto Summary,
    IReadOnlyList<SessionOverviewStatusDto> ByStatus,
    IReadOnlyList<SessionOverviewTimelinePointDto> Timeline
);
