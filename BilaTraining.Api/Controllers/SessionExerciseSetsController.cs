using BilaTraining.Application.Features.SessionExerciseSets.Commands.AddSessionExerciseSet;
using BilaTraining.Application.Features.SessionExerciseSets.Commands.RemoveSessionExerciseSet;
using BilaTraining.Application.Features.SessionExerciseSets.Commands.UpdateSessionExerciseSet;
using BilaTraining.Application.Features.SessionExerciseSets.Dtos;
using BilaTraining.Application.Features.SessionExerciseSets.Queries.GetSessionExerciseSets;
using BilaTraining.Application.Messaging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BilaTraining.Api.Controllers;

[ApiController]
[Authorize]
[Route("api")]
public sealed class SessionExerciseSetsController : ControllerBase
{
    private readonly IDispatcher _dispatcher;

    public SessionExerciseSetsController(IDispatcher dispatcher)
    {
        _dispatcher = dispatcher;
    }

    [HttpGet("session-exercises/{sessionExerciseId:guid}/sets")]
    [ProducesResponseType(typeof(IReadOnlyList<SessionExerciseSetDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<SessionExerciseSetDto>>> GetAll(Guid sessionExerciseId, CancellationToken ct)
    {
        try
        {
            var sets = await _dispatcher.Send(new GetSessionExerciseSetsQuery(sessionExerciseId), ct);
            return Ok(sets);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPost("session-exercises/{sessionExerciseId:guid}/sets")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Add(Guid sessionExerciseId, AddSessionExerciseSetRequest request, CancellationToken ct)
    {
        try
        {
            var id = await _dispatcher.Send(
                new AddSessionExerciseSetCommand(
                    sessionExerciseId,
                    request.SetNumber,
                    request.Repetitions,
                    request.Weight,
                    request.WeightUnit,
                    request.Notes),
                ct);

            return CreatedAtAction(nameof(GetAll), new { sessionExerciseId }, new { id });
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (ArgumentOutOfRangeException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("session-exercise-sets/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, UpdateSessionExerciseSetRequest request, CancellationToken ct)
    {
        try
        {
            await _dispatcher.Send(
                new UpdateSessionExerciseSetCommand(
                    id,
                    request.SetNumber,
                    request.Repetitions,
                    request.Weight,
                    request.WeightUnit,
                    request.Notes),
                ct);

            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (ArgumentOutOfRangeException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("session-exercise-sets/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Remove(Guid id, CancellationToken ct)
    {
        try
        {
            await _dispatcher.Send(new RemoveSessionExerciseSetCommand(id), ct);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    public sealed record AddSessionExerciseSetRequest(
        int SetNumber,
        int? Repetitions,
        decimal? Weight,
        string? WeightUnit,
        string? Notes);

    public sealed record UpdateSessionExerciseSetRequest(
        int SetNumber,
        int? Repetitions,
        decimal? Weight,
        string? WeightUnit,
        string? Notes);
}
