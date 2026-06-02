using BilaTraining.Application.Abstractions;
using BilaTraining.Application.Features.Reports;
using BilaTraining.Application.Features.Reports.Dtos;
using BilaTraining.Application.Messaging;
using BilaTraining.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace BilaTraining.Application.Features.Reports.Queries.GetExerciseProgressReport;

public sealed class GetExerciseProgressReportHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser
) : IRequestHandler<GetExerciseProgressReportQuery, ExerciseProgressReportDto>
{
    public async Task<ExerciseProgressReportDto> Handle(GetExerciseProgressReportQuery request, CancellationToken ct)
    {
        EnsureAuthenticated(currentUser);

        var periodContext = ReportPeriodHelper.Resolve(request.Period, request.AnchorDate, request.TimeZone);
        var startUtc = ReportPeriodHelper.ConvertLocalDateToUtc(periodContext.StartDate, periodContext.TimeZone);
        var endUtcExclusive = ReportPeriodHelper.ConvertLocalDateToUtc(periodContext.EndDate.AddDays(1), periodContext.TimeZone);

        var query =
            from set in db.SessionExerciseSets.AsNoTracking()
            join sessionExercise in db.SessionExercises.AsNoTracking() on set.SessionExerciseId equals sessionExercise.Id
            join session in db.Sessions.AsNoTracking() on sessionExercise.SessionId equals session.Id
            where session.UserId == currentUser.UserId
                && !session.IsDeleted
                && session.Status == SessionStatus.Completed
                && session.StartAtUtc >= startUtc
                && session.StartAtUtc < endUtcExclusive
            select new ExerciseProgressRow(
                session.Id,
                session.ClientId,
                sessionExercise.ExerciseId,
                session.StartAtUtc,
                set.Repetitions,
                set.Weight);

        if (request.ClientId.HasValue)
            query = query.Where(item => item.ClientId == request.ClientId.Value);

        if (request.ExerciseId.HasValue)
            query = query.Where(item => item.ExerciseId == request.ExerciseId.Value);

        var rows = await query.ToListAsync(ct);
        var summary = BuildSummary(rows);
        var timeline = BuildTimeline(rows, periodContext.StartDate, periodContext.EndDate, periodContext.TimeZone);

        return new ExerciseProgressReportDto(
            new SessionOverviewPeriodDto(
                periodContext.Period,
                periodContext.AnchorDate,
                periodContext.StartDate,
                periodContext.EndDate,
                periodContext.PreviousAnchorDate,
                periodContext.NextAnchorDate,
                periodContext.TimeZone.Id),
            summary,
            timeline);
    }

    private static ExerciseProgressSummaryDto BuildSummary(IReadOnlyList<ExerciseProgressRow> rows)
    {
        if (rows.Count == 0)
        {
            return new ExerciseProgressSummaryDto(0, 0, 0, 0m, 0m);
        }

        return new ExerciseProgressSummaryDto(
            rows.Select(item => item.SessionId).Distinct().Count(),
            rows.Count,
            rows.Sum(item => item.Repetitions ?? 0),
            rows.Sum(item => CalculateVolume(item.Repetitions, item.Weight)),
            rows.Max(item => item.Weight ?? 0m));
    }

    private static IReadOnlyList<ExerciseProgressTimelinePointDto> BuildTimeline(
        IReadOnlyList<ExerciseProgressRow> rows,
        DateOnly startDate,
        DateOnly endDate,
        TimeZoneInfo timeZone)
    {
        var dayCount = endDate.DayNumber - startDate.DayNumber + 1;
        var buckets = Enumerable.Range(0, dayCount).ToDictionary(
            offset => startDate.AddDays(offset),
            _ => new TimelineAccumulator());

        foreach (var row in rows)
        {
            var sessionUtc = ReportPeriodHelper.EnsureUtc(row.SessionStartAtUtc);
            var localDate = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(sessionUtc, timeZone));

            if (!buckets.TryGetValue(localDate, out var bucket))
                continue;

            bucket.SessionIds.Add(row.SessionId);
            bucket.TotalSets++;
            bucket.TotalRepetitions += row.Repetitions ?? 0;
            bucket.TotalVolume += CalculateVolume(row.Repetitions, row.Weight);
            bucket.MaxWeight = Math.Max(bucket.MaxWeight, row.Weight ?? 0m);
        }

        return buckets
            .OrderBy(pair => pair.Key)
            .Select(pair => new ExerciseProgressTimelinePointDto(
                pair.Key,
                pair.Value.SessionIds.Count,
                pair.Value.TotalSets,
                pair.Value.TotalRepetitions,
                pair.Value.TotalVolume,
                pair.Value.MaxWeight))
            .ToList();
    }

    private static decimal CalculateVolume(int? repetitions, decimal? weight)
    {
        if (!repetitions.HasValue || !weight.HasValue)
            return 0m;

        return repetitions.Value * weight.Value;
    }

    private static void EnsureAuthenticated(ICurrentUser currentUser)
    {
        if (!currentUser.IsAuthenticated)
            throw new UnauthorizedAccessException();
    }

    private sealed record ExerciseProgressRow(
        Guid SessionId,
        Guid ClientId,
        Guid ExerciseId,
        DateTime SessionStartAtUtc,
        int? Repetitions,
        decimal? Weight
    );

    private sealed class TimelineAccumulator
    {
        public HashSet<Guid> SessionIds { get; } = [];
        public int TotalSets { get; set; }
        public int TotalRepetitions { get; set; }
        public decimal TotalVolume { get; set; }
        public decimal MaxWeight { get; set; }
    }
}
