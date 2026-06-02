namespace BilaTraining.Application.Features.Reports;

internal static class ReportPeriodHelper
{
    public static ReportPeriodContext Resolve(string? period, DateOnly? anchorDate, string? timeZone)
    {
        var normalizedPeriod = NormalizePeriod(period);
        var resolvedTimeZone = ResolveTimeZone(timeZone);
        var resolvedAnchorDate = anchorDate ?? DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, resolvedTimeZone));
        var range = BuildRange(normalizedPeriod, resolvedAnchorDate);

        return new ReportPeriodContext(
            normalizedPeriod,
            resolvedAnchorDate,
            range.StartDate,
            range.EndDate,
            GetPreviousAnchorDate(normalizedPeriod, resolvedAnchorDate),
            GetNextAnchorDate(normalizedPeriod, resolvedAnchorDate),
            resolvedTimeZone);
    }

    public static DateTime ConvertLocalDateToUtc(DateOnly date, TimeZoneInfo timeZone)
    {
        var localDateTime = date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified);
        return TimeZoneInfo.ConvertTimeToUtc(localDateTime, timeZone);
    }

    public static DateTime EnsureUtc(DateTime value)
        => value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
        };

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

    internal sealed record ReportPeriodContext(
        string Period,
        DateOnly AnchorDate,
        DateOnly StartDate,
        DateOnly EndDate,
        DateOnly PreviousAnchorDate,
        DateOnly NextAnchorDate,
        TimeZoneInfo TimeZone);

    private sealed record ReportRange(
        DateOnly StartDate,
        DateOnly EndDate
    );
}
