using BilaTraining.Application.Messaging;

namespace BilaTraining.Application.Features.Sessions.Commands.UpdateSession;

public sealed record UpdateSessionCommand(
    Guid Id,
    Guid WorkspaceId,
    Guid ClientId,
    string? Notes,
    DateTime StartAtUtc,
    DateTime EndAtUtc
) : IRequest<bool>;
