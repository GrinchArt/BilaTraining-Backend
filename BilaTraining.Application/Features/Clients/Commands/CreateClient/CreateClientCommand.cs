using BilaTraining.Application.Messaging;

namespace BilaTraining.Application.Features.Clients.Commands.CreateClient;

public sealed record CreateClientCommand(
    string FirstName,
    string? LastName,
    string? Phone,
    string? Email,
    string? Notes
) : IRequest<Guid>;
