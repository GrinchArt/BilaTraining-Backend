using BilaTraining.Application.Features.SessionExercises.Commands.AddSessionExercise;
using BilaTraining.Application.Features.SessionExercises.Commands.RemoveSessionExercise;
using BilaTraining.Application.Features.SessionExercises.Commands.UpdateSessionExercise;
using BilaTraining.Application.Features.SessionExercises.Dtos;
using BilaTraining.Application.Features.SessionExercises.Queries.GetSessionExercises;
using BilaTraining.Application.Messaging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BilaTraining.Api.Controllers;

[ApiController]
[Authorize]
[Route("api")]
public sealed class SessionExercisesController : ControllerBase
{
    private readonly IDispatcher _dispatcher;

    public SessionExercisesController(IDispatcher dispatcher)
    {
        _dispatcher = dispatcher;
    }

    [HttpGet("sessions/{sessionId:guid}/exercises")]
    [ProducesResponseType(typeof(IReadOnlyList<SessionExerciseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<SessionExerciseDto>>> GetAll(Guid sessionId, CancellationToken ct)
    {
        try
        {
            var exercises = await _dispatcher.Send(new GetSessionExercisesQuery(sessionId), ct);
            return Ok(exercises);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPost("sessions/{sessionId:guid}/exercises")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Add(Guid sessionId, AddSessionExerciseRequest request, CancellationToken ct)
    {
        try
        {
            var id = await _dispatcher.Send(
                new AddSessionExerciseCommand(sessionId, request.ExerciseId, request.SortOrder, request.Notes),
                ct);

            return CreatedAtAction(nameof(GetAll), new { sessionId }, new { id });
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPut("session-exercises/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, UpdateSessionExerciseRequest request, CancellationToken ct)
    {
        try
        {
            await _dispatcher.Send(new UpdateSessionExerciseCommand(id, request.SortOrder, request.Notes), ct);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpDelete("session-exercises/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Remove(Guid id, CancellationToken ct)
    {
        try
        {
            await _dispatcher.Send(new RemoveSessionExerciseCommand(id), ct);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    public sealed record AddSessionExerciseRequest(Guid ExerciseId, int SortOrder, string? Notes);

    public sealed record UpdateSessionExerciseRequest(int SortOrder, string? Notes);
}
