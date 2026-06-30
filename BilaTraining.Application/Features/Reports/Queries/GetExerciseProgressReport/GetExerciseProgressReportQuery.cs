using BilaTraining.Application.Features.Reports.Dtos;
using BilaTraining.Application.Messaging;

namespace BilaTraining.Application.Features.Reports.Queries.GetExerciseProgressReport;

public sealed record GetExerciseProgressReportQuery(
    string? Period = null,
    DateOnly? AnchorDate = null,
    string? TimeZone = null,
    Guid? WorkspaceId = null,
    Guid? ClientId = null,
    Guid? ExerciseId = null
) : IRequest<ExerciseProgressReportDto>;
