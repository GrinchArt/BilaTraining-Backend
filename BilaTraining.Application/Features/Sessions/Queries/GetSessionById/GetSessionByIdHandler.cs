using BilaTraining.Application.Abstractions;
using BilaTraining.Application.Features.Sessions.Dtos;
using BilaTraining.Application.Messaging;
using Microsoft.EntityFrameworkCore;

namespace BilaTraining.Application.Features.Sessions.Queries.GetSessionById;

public sealed class GetSessionByIdHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser
) : IRequestHandler<GetSessionByIdQuery, SessionDto>
{
    public async Task<SessionDto> Handle(GetSessionByIdQuery request, CancellationToken ct)
    {
        EnsureAuthenticated(currentUser);

        var session = await db.Sessions
            .AsNoTracking()
            .Where(s => s.Id == request.Id && s.UserId == currentUser.UserId && !s.IsDeleted)
            .Select(s => new SessionDto(
                s.Id,
                s.WorkspaceId,
                s.ClientId,
                s.Notes,
                s.StartAtUtc,
                s.EndAtUtc,
                s.Status))
            .SingleOrDefaultAsync(ct);

        return session ?? throw new KeyNotFoundException($"Session '{request.Id}' was not found.");
    }

    private static void EnsureAuthenticated(ICurrentUser currentUser)
    {
        if (!currentUser.IsAuthenticated)
            throw new UnauthorizedAccessException();
    }
}
