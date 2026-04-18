using BilaTraining.Application.Features.Sessions.Dtos;
using BilaTraining.Application.Messaging;

namespace BilaTraining.Application.Features.Sessions.Queries.GetSessions;

public sealed record GetSessionsQuery(
    Guid? WorkspaceId = null,
    Guid? ClientId = null
) : IRequest<IReadOnlyList<SessionDto>>;
