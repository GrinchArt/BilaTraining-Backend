using BilaTraining.Application.Features.WorkspaceClients.Commands.AddClientToWorkspace;
using BilaTraining.Application.Features.WorkspaceClients.Commands.RemoveClientFromWorkspace;
using BilaTraining.Application.Features.WorkspaceClients.Dtos;
using BilaTraining.Application.Features.WorkspaceClients.Queries.GetWorkspaceClients;
using BilaTraining.Application.Messaging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BilaTraining.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/workspaces/{workspaceId:guid}/clients")]
public sealed class WorkspaceClientsController : ControllerBase
{
    private readonly IDispatcher _dispatcher;

    public WorkspaceClientsController(IDispatcher dispatcher)
    {
        _dispatcher = dispatcher;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<WorkspaceClientDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<WorkspaceClientDto>>> GetAll(Guid workspaceId, CancellationToken ct)
    {
        try
        {
            var clients = await _dispatcher.Send(new GetWorkspaceClientsQuery(workspaceId), ct);
            return Ok(clients);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPost("{clientId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Add(Guid workspaceId, Guid clientId, CancellationToken ct)
    {
        try
        {
            await _dispatcher.Send(new AddClientToWorkspaceCommand(workspaceId, clientId), ct);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpDelete("{clientId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Remove(Guid workspaceId, Guid clientId, CancellationToken ct)
    {
        try
        {
            await _dispatcher.Send(new RemoveClientFromWorkspaceCommand(workspaceId, clientId), ct);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }
}
