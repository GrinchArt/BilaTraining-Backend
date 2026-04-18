using BilaTraining.Application.Messaging;

namespace BilaTraining.Application.Features.Clients.Commands.UpdateClient;

public sealed record UpdateClientCommand(
    Guid Id,
    string FirstName,
    string? LastName,
    string? Phone,
    string? Email,
    string? Notes
) : IRequest<bool>;
