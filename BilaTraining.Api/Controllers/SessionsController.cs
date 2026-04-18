using BilaTraining.Application.Features.Sessions.Commands.CreateSession;
using BilaTraining.Application.Features.Sessions.Commands.DeleteSession;
using BilaTraining.Application.Features.Sessions.Commands.UpdateSession;
using BilaTraining.Application.Features.Sessions.Commands.UpdateSessionStatus;
using BilaTraining.Application.Features.Sessions.Dtos;
using BilaTraining.Application.Features.Sessions.Queries.GetSessionById;
using BilaTraining.Application.Features.Sessions.Queries.GetSessions;
using BilaTraining.Application.Messaging;
using BilaTraining.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BilaTraining.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public sealed class SessionsController : ControllerBase
{
    private readonly IDispatcher _dispatcher;

    public SessionsController(IDispatcher dispatcher)
    {
        _dispatcher = dispatcher;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<SessionDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<SessionDto>>> GetAll(
        [FromQuery] Guid? workspaceId,
        [FromQuery] Guid? clientId,
        CancellationToken ct)
    {
        var sessions = await _dispatcher.Send(new GetSessionsQuery(workspaceId, clientId), ct);
        return Ok(sessions);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(SessionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SessionDto>> GetById(Guid id, CancellationToken ct)
    {
        try
        {
            var session = await _dispatcher.Send(new GetSessionByIdQuery(id), ct);
            return Ok(session);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPost]
    [ProducesResponseType(typeof(SessionDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SessionDto>> Create(CreateSessionRequest request, CancellationToken ct)
    {
        try
        {
            var id = await _dispatcher.Send(
                new CreateSessionCommand(
                    request.WorkspaceId,
                    request.ClientId,
                    request.Notes,
                    request.StartAtUtc,
                    request.EndAtUtc),
                ct);

            var session = await _dispatcher.Send(new GetSessionByIdQuery(id), ct);
            return CreatedAtAction(nameof(GetById), new { id }, session);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, UpdateSessionRequest request, CancellationToken ct)
    {
        try
        {
            await _dispatcher.Send(
                new UpdateSessionCommand(
                    id,
                    request.WorkspaceId,
                    request.ClientId,
                    request.Notes,
                    request.StartAtUtc,
                    request.EndAtUtc),
                ct);

            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPatch("{id:guid}/status")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateStatus(Guid id, UpdateSessionStatusRequest request, CancellationToken ct)
    {
        try
        {
            await _dispatcher.Send(new UpdateSessionStatusCommand(id, request.Status), ct);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        try
        {
            await _dispatcher.Send(new DeleteSessionCommand(id), ct);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    public sealed record CreateSessionRequest(
        Guid WorkspaceId,
        Guid ClientId,
        string? Notes,
        DateTime StartAtUtc,
        DateTime EndAtUtc);

    public sealed record UpdateSessionRequest(
        Guid WorkspaceId,
        Guid ClientId,
        string? Notes,
        DateTime StartAtUtc,
        DateTime EndAtUtc);

    public sealed record UpdateSessionStatusRequest(SessionStatus Status);
}
