using BilaTraining.Application.Messaging;
using BilaTraining.Domain.Enums;

namespace BilaTraining.Application.Features.Sessions.Commands.CreateSession;

public sealed record CreateSessionsBulkCommand(
    Guid WorkspaceId,
    Guid ClientId,
    string? Notes,
    IReadOnlyList<SessionTimeRange> Sessions,
    SessionStatus? Status = null
) : IRequest<IReadOnlyList<Guid>>;

public sealed record SessionTimeRange(
    DateTime StartAtUtc,
    DateTime EndAtUtc
);
