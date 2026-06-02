using BilaTraining.Application.Abstractions;
using BilaTraining.Application.Features.Reports;
using BilaTraining.Application.Features.Reports.Dtos;
using BilaTraining.Application.Messaging;
using BilaTraining.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace BilaTraining.Application.Features.Reports.Queries.GetSessionOverviewReport;

public sealed class GetSessionOverviewReportHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser
) : IRequestHandler<GetSessionOverviewReportQuery, SessionOverviewReportDto>
{
    public async Task<SessionOverviewReportDto> Handle(GetSessionOverviewReportQuery request, CancellationToken ct)
    {
        EnsureAuthenticated(currentUser);

        var periodContext = ReportPeriodHelper.Resolve(request.Period, request.AnchorDate, request.TimeZone);
        var startUtc = ReportPeriodHelper.ConvertLocalDateToUtc(periodContext.StartDate, periodContext.TimeZone);
        var endUtcExclusive = ReportPeriodHelper.ConvertLocalDateToUtc(periodContext.EndDate.AddDays(1), periodContext.TimeZone);

        var query = db.Sessions
            .AsNoTracking()
            .Where(s =>
                s.UserId == currentUser.UserId &&
                !s.IsDeleted &&
                s.StartAtUtc >= startUtc &&
                s.StartAtUtc < endUtcExclusive);

        if (request.WorkspaceId.HasValue)
            query = query.Where(s => s.WorkspaceId == request.WorkspaceId.Value);

        var sessions = await query
            .Select(s => new SessionReportRow(
                s.StartAtUtc,
                s.Status))
            .ToListAsync(ct);

        var timeline = BuildTimeline(sessions, periodContext.StartDate, periodContext.EndDate, periodContext.TimeZone);
        var summary = new SessionOverviewSummaryDto(
            timeline.Sum(point => point.Total),
            timeline.Sum(point => point.Planned),
            timeline.Sum(point => point.Completed),
            timeline.Sum(point => point.Cancelled),
            timeline.Sum(point => point.NoShow));

        var byStatus = new[]
        {
            new SessionOverviewStatusDto(SessionStatus.Planned, summary.Planned),
            new SessionOverviewStatusDto(SessionStatus.Completed, summary.Completed),
            new SessionOverviewStatusDto(SessionStatus.Cancelled, summary.Cancelled),
            new SessionOverviewStatusDto(SessionStatus.NoShow, summary.NoShow),
        };

        return new SessionOverviewReportDto(
            new SessionOverviewPeriodDto(
                periodContext.Period,
                periodContext.AnchorDate,
                periodContext.StartDate,
                periodContext.EndDate,
                periodContext.PreviousAnchorDate,
                periodContext.NextAnchorDate,
                periodContext.TimeZone.Id),
            summary,
            byStatus,
            timeline);
    }

    private static IReadOnlyList<SessionOverviewTimelinePointDto> BuildTimeline(
        IReadOnlyList<SessionReportRow> sessions,
        DateOnly startDate,
        DateOnly endDate,
        TimeZoneInfo timeZone)
    {
        var dayCount = endDate.DayNumber - startDate.DayNumber + 1;
        var buckets = Enumerable.Range(0, dayCount).ToDictionary(
            offset => startDate.AddDays(offset),
            _ => new TimelineAccumulator());

        foreach (var session in sessions)
        {
            var sessionUtc = ReportPeriodHelper.EnsureUtc(session.StartAtUtc);
            var localDate = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(sessionUtc, timeZone));

            if (!buckets.TryGetValue(localDate, out var bucket))
                continue;

            bucket.Total++;

            switch (session.Status)
            {
                case SessionStatus.Planned:
                    bucket.Planned++;
                    break;
                case SessionStatus.Completed:
                    bucket.Completed++;
                    break;
                case SessionStatus.Cancelled:
                    bucket.Cancelled++;
                    break;
                case SessionStatus.NoShow:
                    bucket.NoShow++;
                    break;
            }
        }

        return buckets
            .OrderBy(pair => pair.Key)
            .Select(pair => new SessionOverviewTimelinePointDto(
                pair.Key,
                pair.Value.Total,
                pair.Value.Planned,
                pair.Value.Completed,
                pair.Value.Cancelled,
                pair.Value.NoShow))
            .ToList();
    }

    private static void EnsureAuthenticated(ICurrentUser currentUser)
    {
        if (!currentUser.IsAuthenticated)
            throw new UnauthorizedAccessException();
    }

    private sealed record SessionReportRow(
        DateTime StartAtUtc,
        SessionStatus Status
    );

    private sealed class TimelineAccumulator
    {
        public int Total { get; set; }
        public int Planned { get; set; }
        public int Completed { get; set; }
        public int Cancelled { get; set; }
        public int NoShow { get; set; }
    }
}
