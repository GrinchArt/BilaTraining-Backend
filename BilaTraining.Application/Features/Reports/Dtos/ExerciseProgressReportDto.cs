namespace BilaTraining.Application.Features.Reports.Dtos;

public sealed record ExerciseProgressReportDto(
    SessionOverviewPeriodDto Period,
    ExerciseProgressSummaryDto Summary,
    IReadOnlyList<ExerciseProgressTimelinePointDto> Timeline
);
