using BilaTraining.Application.Features.Clients.Commands.CreateClient;
using BilaTraining.Application.Features.Clients.Commands.DeleteClient;
using BilaTraining.Application.Features.Clients.Commands.UpdateClient;
using BilaTraining.Application.Features.Clients.Dtos;
using BilaTraining.Application.Features.Clients.Queries.GetClientById;
using BilaTraining.Application.Features.Clients.Queries.GetClients;
using BilaTraining.Application.Messaging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BilaTraining.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public sealed class ClientsController : ControllerBase
{
    private readonly IDispatcher _dispatcher;

    public ClientsController(IDispatcher dispatcher)
    {
        _dispatcher = dispatcher;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ClientDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ClientDto>>> GetAll(
        [FromQuery] string? search,
        CancellationToken ct)
    {
        var clients = await _dispatcher.Send(new GetClientsQuery(search), ct);
        return Ok(clients);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ClientDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ClientDto>> GetById(Guid id, CancellationToken ct)
    {
        try
        {
            var client = await _dispatcher.Send(new GetClientByIdQuery(id), ct);
            return Ok(client);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPost]
    [ProducesResponseType(typeof(ClientDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ClientDto>> Create(CreateClientRequest request, CancellationToken ct)
    {
        try
        {
            var id = await _dispatcher.Send(
                new CreateClientCommand(
                    request.FirstName,
                    request.LastName,
                    request.Phone,
                    request.Email,
                    request.Notes),
                ct);

            var client = await _dispatcher.Send(new GetClientByIdQuery(id), ct);
            return CreatedAtAction(nameof(GetById), new { id }, client);
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
    public async Task<IActionResult> Update(Guid id, UpdateClientRequest request, CancellationToken ct)
    {
        try
        {
            await _dispatcher.Send(
                new UpdateClientCommand(
                    id,
                    request.FirstName,
                    request.LastName,
                    request.Phone,
                    request.Email,
                    request.Notes),
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
            await _dispatcher.Send(new DeleteClientCommand(id), ct);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    public sealed record CreateClientRequest(
        string FirstName,
        string? LastName,
        string? Phone,
        string? Email,
        string? Notes);

    public sealed record UpdateClientRequest(
        string FirstName,
        string? LastName,
        string? Phone,
        string? Email,
        string? Notes);
}
