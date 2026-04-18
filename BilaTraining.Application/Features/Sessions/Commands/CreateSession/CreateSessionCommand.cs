using BilaTraining.Application.Messaging;

namespace BilaTraining.Application.Features.Sessions.Commands.CreateSession;

public sealed record CreateSessionCommand(
    Guid WorkspaceId,
    Guid ClientId,
    string? Notes,
    DateTime StartAtUtc,
    DateTime EndAtUtc
) : IRequest<Guid>;
