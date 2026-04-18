using BilaTraining.Application.Abstractions;
using BilaTraining.Application.Messaging;
using BilaTraining.Application.Features.Sessions.Commands.CreateSession;
using Microsoft.EntityFrameworkCore;

namespace BilaTraining.Application.Features.Sessions.Commands.UpdateSession;

public sealed class UpdateSessionHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser
) : IRequestHandler<UpdateSessionCommand, bool>
{
    public async Task<bool> Handle(UpdateSessionCommand request, CancellationToken ct)
    {
        EnsureAuthenticated(currentUser);

        var session = await db.Sessions
            .SingleOrDefaultAsync(
                s => s.Id == request.Id && s.UserId == currentUser.UserId && !s.IsDeleted,
                ct);

        if (session is null)
            throw new KeyNotFoundException($"Session '{request.Id}' was not found.");

        await CreateSessionHandler.EnsureOwnedSessionRelationsAsync(
            request.WorkspaceId,
            request.ClientId,
            db,
            currentUser,
            ct);

        session.Reassign(request.WorkspaceId, request.ClientId);
        session.UpdateDetails(request.StartAtUtc, request.EndAtUtc, request.Notes);

        await db.SaveChangesAsync(ct);
        return true;
    }

    private static void EnsureAuthenticated(ICurrentUser currentUser)
    {
        if (!currentUser.IsAuthenticated)
            throw new UnauthorizedAccessException();
    }
}
