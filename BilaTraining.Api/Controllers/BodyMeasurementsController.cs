using BilaTraining.Application.Abstractions;
using BilaTraining.Domain.Entities;
using BilaTraining.Domain.Enums;
using BilaTraining.Infrastructure.Identity;
using BilaTraining.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BilaTraining.Api.Controllers;

[ApiController]
[Authorize]
public sealed class BodyMeasurementsController(
    ApplicationDbContext db,
    ICurrentUser currentUser
) : ControllerBase
{
    [HttpGet("api/my/body-measurements")]
    [Authorize(Roles = AppRoles.Client)]
    public async Task<ActionResult<IReadOnlyList<BodyMeasurementResponse>>> GetMine(CancellationToken ct)
    {
        var measurements = await LoadForUser(currentUser.UserId, ct);
        return Ok(measurements);
    }

    [HttpPost("api/my/body-measurements")]
    [Authorize(Roles = AppRoles.Client)]
    public async Task<ActionResult<BodyMeasurementResponse>> Create(
        BodyMeasurementRequest request,
        CancellationToken ct)
    {
        try
        {
            var measurement = CreateMeasurement(currentUser.UserId, request);
            db.BodyMeasurements.Add(measurement);
            await db.SaveChangesAsync(ct);

            return Created($"/api/my/body-measurements/{measurement.Id}", BodyMeasurementResponse.From(measurement));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("api/my/body-measurements/{id:guid}")]
    [Authorize(Roles = AppRoles.Client)]
    public async Task<IActionResult> Update(Guid id, BodyMeasurementRequest request, CancellationToken ct)
    {
        var measurement = await db.BodyMeasurements
            .FirstOrDefaultAsync(x => x.Id == id && x.UserId == currentUser.UserId && !x.IsDeleted, ct);

        if (measurement is null)
            return NotFound();

        try
        {
            ApplyRequest(measurement, request);
            await db.SaveChangesAsync(ct);
            return NoContent();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("api/my/body-measurements/{id:guid}")]
    [Authorize(Roles = AppRoles.Client)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var measurement = await db.BodyMeasurements
            .FirstOrDefaultAsync(x => x.Id == id && x.UserId == currentUser.UserId && !x.IsDeleted, ct);

        if (measurement is null)
            return NotFound();

        measurement.SoftDelete();
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpGet("api/clients/{clientId:guid}/body-measurements")]
    [Authorize(Roles = AppRoles.Trainer)]
    public async Task<ActionResult<IReadOnlyList<BodyMeasurementResponse>>> GetForTrainer(
        Guid clientId,
        CancellationToken ct)
    {
        var access = await (
            from relationship in db.CoachClientRelationships.AsNoTracking()
            join client in db.Clients.AsNoTracking() on relationship.ClientId equals client.Id
            where relationship.CoachUserId == currentUser.UserId &&
                  relationship.ClientId == clientId &&
                  relationship.Status == CoachClientRelationshipStatus.Active &&
                  !relationship.IsDeleted &&
                  !client.IsDeleted
            select new { client.LinkedUserId })
            .FirstOrDefaultAsync(ct);

        if (access is null)
            return Forbid();

        if (!access.LinkedUserId.HasValue)
            return Ok(Array.Empty<BodyMeasurementResponse>());

        var measurements = await LoadForUser(access.LinkedUserId.Value, ct);
        return Ok(measurements);
    }

    private async Task<IReadOnlyList<BodyMeasurementResponse>> LoadForUser(Guid userId, CancellationToken ct)
    {
        var measurements = await db.BodyMeasurements
            .AsNoTracking()
            .Where(x => x.UserId == userId && !x.IsDeleted)
            .OrderByDescending(x => x.RecordedOn)
            .ThenByDescending(x => x.CreatedAtUtc)
            .Take(1000)
            .ToListAsync(ct);

        return measurements.Select(BodyMeasurementResponse.From).ToList();
    }

    private static BodyMeasurement CreateMeasurement(Guid userId, BodyMeasurementRequest request) =>
        new(userId, request.RecordedOn, request.WeightKg, request.HeightCm, request.BodyFatPercent,
            request.NeckCm, request.ChestCm, request.WaistCm, request.HipsCm, request.BicepsCm,
            request.ThighCm, request.CalfCm, request.Notes);

    private static void ApplyRequest(BodyMeasurement measurement, BodyMeasurementRequest request) =>
        measurement.Update(request.RecordedOn, request.WeightKg, request.HeightCm, request.BodyFatPercent,
            request.NeckCm, request.ChestCm, request.WaistCm, request.HipsCm, request.BicepsCm,
            request.ThighCm, request.CalfCm, request.Notes);

    public sealed record BodyMeasurementRequest(
        DateOnly RecordedOn,
        decimal? WeightKg,
        decimal? HeightCm,
        decimal? BodyFatPercent,
        decimal? NeckCm,
        decimal? ChestCm,
        decimal? WaistCm,
        decimal? HipsCm,
        decimal? BicepsCm,
        decimal? ThighCm,
        decimal? CalfCm,
        string? Notes);

    public sealed record BodyMeasurementResponse(
        Guid Id,
        DateOnly RecordedOn,
        decimal? WeightKg,
        decimal? HeightCm,
        decimal? BodyFatPercent,
        decimal? NeckCm,
        decimal? ChestCm,
        decimal? WaistCm,
        decimal? HipsCm,
        decimal? BicepsCm,
        decimal? ThighCm,
        decimal? CalfCm,
        string? Notes,
        DateTime CreatedAtUtc,
        DateTime UpdatedAtUtc)
    {
        public static BodyMeasurementResponse From(BodyMeasurement measurement) =>
            new(measurement.Id, measurement.RecordedOn, measurement.WeightKg, measurement.HeightCm,
                measurement.BodyFatPercent, measurement.NeckCm, measurement.ChestCm,
                measurement.WaistCm, measurement.HipsCm, measurement.BicepsCm,
                measurement.ThighCm, measurement.CalfCm, measurement.Notes,
                measurement.CreatedAtUtc, measurement.UpdatedAtUtc);
    }
}
