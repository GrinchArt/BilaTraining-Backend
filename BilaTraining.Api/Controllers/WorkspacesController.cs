using BilaTraining.Application.Features.Workspaces.Commands.CreateWorkspace;
using BilaTraining.Application.Features.Workspaces.Commands.DeleteWorkspace;
using BilaTraining.Application.Features.Workspaces.Commands.UpdateWorkspace;
using BilaTraining.Application.Features.Workspaces.Dtos;
using BilaTraining.Application.Features.Workspaces.Queries.GetWorkspaceById;
using BilaTraining.Application.Features.Workspaces.Queries.GetWorkspaces;
using BilaTraining.Application.Messaging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BilaTraining.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public sealed class WorkspacesController : ControllerBase
{
    private readonly IDispatcher _dispatcher;

    public WorkspacesController(IDispatcher dispatcher)
    {
        _dispatcher = dispatcher;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<WorkspaceDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<WorkspaceDto>>> GetAll(CancellationToken ct)
    {
        var workspaces = await _dispatcher.Send(new GetWorkspacesQuery(), ct);
        return Ok(workspaces);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(WorkspaceDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<WorkspaceDto>> GetById(Guid id, CancellationToken ct)
    {
        try
        {
            var workspace = await _dispatcher.Send(new GetWorkspaceByIdQuery(id), ct);
            return Ok(workspace);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPost]
    [ProducesResponseType(typeof(WorkspaceDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<WorkspaceDto>> Create(CreateWorkspaceRequest request, CancellationToken ct)
    {
        try
        {
            var id = await _dispatcher.Send(
                new CreateWorkspaceCommand(request.Name, request.Description, request.ColorHex),
                ct);

            var workspace = await _dispatcher.Send(new GetWorkspaceByIdQuery(id), ct);
            return CreatedAtAction(nameof(GetById), new { id }, workspace);
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
    public async Task<IActionResult> Update(Guid id, UpdateWorkspaceRequest request, CancellationToken ct)
    {
        try
        {
            await _dispatcher.Send(
                new UpdateWorkspaceCommand(id, request.Name, request.Description, request.ColorHex),
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

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        try
        {
            await _dispatcher.Send(new DeleteWorkspaceCommand(id), ct);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    public sealed record CreateWorkspaceRequest(
        string Name,
        string? Description,
        string? ColorHex);

    public sealed record UpdateWorkspaceRequest(
        string Name,
        string? Description,
        string? ColorHex);
}
