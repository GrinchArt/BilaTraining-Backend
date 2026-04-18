using BilaTraining.Application.Abstractions;
using BilaTraining.Application.Messaging;
using Microsoft.EntityFrameworkCore;

namespace BilaTraining.Application.Features.Sessions.Commands.DeleteSession;

public sealed class DeleteSessionHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser
) : IRequestHandler<DeleteSessionCommand, bool>
{
    public async Task<bool> Handle(DeleteSessionCommand request, CancellationToken ct)
    {
        EnsureAuthenticated(currentUser);

        var session = await db.Sessions
            .SingleOrDefaultAsync(
                s => s.Id == request.Id && s.UserId == currentUser.UserId && !s.IsDeleted,
                ct);

        if (session is null)
            throw new KeyNotFoundException($"Session '{request.Id}' was not found.");

        session.SoftDelete();
        await db.SaveChangesAsync(ct);

        return true;
    }

    private static void EnsureAuthenticated(ICurrentUser currentUser)
    {
        if (!currentUser.IsAuthenticated)
            throw new UnauthorizedAccessException();
    }
}
