using BilaTraining.Application.Abstractions;
using BilaTraining.Application.Features.Sessions.Dtos;
using BilaTraining.Application.Messaging;
using Microsoft.EntityFrameworkCore;

namespace BilaTraining.Application.Features.Sessions.Queries.GetSessions;

public sealed class GetSessionsHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser
) : IRequestHandler<GetSessionsQuery, IReadOnlyList<SessionDto>>
{
    public async Task<IReadOnlyList<SessionDto>> Handle(GetSessionsQuery request, CancellationToken ct)
    {
        EnsureAuthenticated(currentUser);

        var query = db.Sessions
            .AsNoTracking()
            .Where(s => s.UserId == currentUser.UserId && !s.IsDeleted);

        if (request.WorkspaceId.HasValue)
            query = query.Where(s => s.WorkspaceId == request.WorkspaceId.Value);

        if (request.ClientId.HasValue)
            query = query.Where(s => s.ClientId == request.ClientId.Value);

        return await query
            .OrderBy(s => s.StartAtUtc)
            .Select(s => new SessionDto(
                s.Id,
                s.WorkspaceId,
                s.ClientId,
                s.Notes,
                s.StartAtUtc,
                s.EndAtUtc,
                s.Status))
            .ToListAsync(ct);
    }

    private static void EnsureAuthenticated(ICurrentUser currentUser)
    {
        if (!currentUser.IsAuthenticated)
            throw new UnauthorizedAccessException();
    }
}
