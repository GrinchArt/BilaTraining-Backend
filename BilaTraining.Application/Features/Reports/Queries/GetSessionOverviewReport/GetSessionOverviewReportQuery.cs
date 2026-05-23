using BilaTraining.Application.Features.Reports.Dtos;
using BilaTraining.Application.Messaging;

namespace BilaTraining.Application.Features.Reports.Queries.GetSessionOverviewReport;

public sealed record GetSessionOverviewReportQuery(
    string? Period = null,
    DateOnly? AnchorDate = null,
    string? TimeZone = null,
    Guid? WorkspaceId = null
) : IRequest<SessionOverviewReportDto>;
