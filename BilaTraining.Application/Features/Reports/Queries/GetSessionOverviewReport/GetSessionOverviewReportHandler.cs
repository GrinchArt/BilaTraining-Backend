using BilaTraining.Application.Abstractions;
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

        var period = NormalizePeriod(request.Period);
        var timeZone = ResolveTimeZone(request.TimeZone);
        var anchorDate = request.AnchorDate ?? DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, timeZone));
        var range = BuildRange(period, anchorDate);
        var startUtc = ConvertLocalDateToUtc(range.StartDate, timeZone);
        var endUtcExclusive = ConvertLocalDateToUtc(range.EndDate.AddDays(1), timeZone);

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

        var timeline = BuildTimeline(sessions, range.StartDate, range.EndDate, timeZone);
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
                period,
                anchorDate,
                range.StartDate,
                range.EndDate,
                GetPreviousAnchorDate(period, anchorDate),
                GetNextAnchorDate(period, anchorDate),
                timeZone.Id),
            summary,
            byStatus,
            timeline);
    }

    private static string NormalizePeriod(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return "month";

        var normalized = value.Trim().ToLowerInvariant();

        return normalized switch
        {
            "week" => normalized,
            "month" => normalized,
            _ => throw new ArgumentException("Period must be either 'week' or 'month'."),
        };
    }

    private static TimeZoneInfo ResolveTimeZone(string? timeZone)
    {
        if (string.IsNullOrWhiteSpace(timeZone))
            return TimeZoneInfo.Utc;

        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(timeZone.Trim());
        }
        catch (TimeZoneNotFoundException)
        {
            throw new ArgumentException("The supplied time zone is invalid.");
        }
        catch (InvalidTimeZoneException)
        {
            throw new ArgumentException("The supplied time zone is invalid.");
        }
    }

    private static ReportRange BuildRange(string period, DateOnly anchorDate)
    {
        if (period == "week")
        {
            var startDate = anchorDate.AddDays(-(((int)anchorDate.DayOfWeek + 6) % 7));
            return new ReportRange(startDate, startDate.AddDays(6));
        }

        var startOfMonth = new DateOnly(anchorDate.Year, anchorDate.Month, 1);
        return new ReportRange(startOfMonth, startOfMonth.AddMonths(1).AddDays(-1));
    }

    private static DateOnly GetPreviousAnchorDate(string period, DateOnly anchorDate)
        => period == "week" ? anchorDate.AddDays(-7) : anchorDate.AddMonths(-1);

    private static DateOnly GetNextAnchorDate(string period, DateOnly anchorDate)
        => period == "week" ? anchorDate.AddDays(7) : anchorDate.AddMonths(1);

    private static DateTime ConvertLocalDateToUtc(DateOnly date, TimeZoneInfo timeZone)
    {
        var localDateTime = date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified);
        return TimeZoneInfo.ConvertTimeToUtc(localDateTime, timeZone);
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
            offset => new TimelineAccumulator());

        foreach (var session in sessions)
        {
            var sessionUtc = EnsureUtc(session.StartAtUtc);
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

    private static DateTime EnsureUtc(DateTime value)
        => value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
        };

    private static void EnsureAuthenticated(ICurrentUser currentUser)
    {
        if (!currentUser.IsAuthenticated)
            throw new UnauthorizedAccessException();
    }

    private sealed record SessionReportRow(
        DateTime StartAtUtc,
        SessionStatus Status
    );

    private sealed record ReportRange(
        DateOnly StartDate,
        DateOnly EndDate
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
