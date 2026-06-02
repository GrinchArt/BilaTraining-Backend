using BilaTraining.Application.Features.Reports.Dtos;
using BilaTraining.Application.Features.Reports.Queries.GetExerciseProgressReport;
using BilaTraining.Application.Features.Reports.Queries.GetSessionOverviewReport;
using BilaTraining.Application.Messaging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BilaTraining.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public sealed class ReportsController : ControllerBase
{
    private readonly IDispatcher _dispatcher;

    public ReportsController(IDispatcher dispatcher)
    {
        _dispatcher = dispatcher;
    }

    [HttpGet("sessions-overview")]
    [ProducesResponseType(typeof(SessionOverviewReportDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SessionOverviewReportDto>> GetSessionsOverview(
        [FromQuery] string? period,
        [FromQuery] DateOnly? anchorDate,
        [FromQuery] string? timeZone,
        [FromQuery] Guid? workspaceId,
        CancellationToken ct)
    {
        try
        {
            var report = await _dispatcher.Send(
                new GetSessionOverviewReportQuery(period, anchorDate, timeZone, workspaceId),
                ct);

            return Ok(report);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("exercise-progress")]
    [ProducesResponseType(typeof(ExerciseProgressReportDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ExerciseProgressReportDto>> GetExerciseProgress(
        [FromQuery] string? period,
        [FromQuery] DateOnly? anchorDate,
        [FromQuery] string? timeZone,
        [FromQuery] Guid? clientId,
        [FromQuery] Guid? exerciseId,
        CancellationToken ct)
    {
        try
        {
            var report = await _dispatcher.Send(
                new GetExerciseProgressReportQuery(period, anchorDate, timeZone, clientId, exerciseId),
                ct);

            return Ok(report);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
