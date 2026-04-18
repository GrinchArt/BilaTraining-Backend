using BilaTraining.Application.Abstractions;
using BilaTraining.Application.Messaging;
using Microsoft.EntityFrameworkCore;

namespace BilaTraining.Application.Features.Sessions.Commands.UpdateSessionStatus;

public sealed class UpdateSessionStatusHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser
) : IRequestHandler<UpdateSessionStatusCommand, bool>
{
    public async Task<bool> Handle(UpdateSessionStatusCommand request, CancellationToken ct)
    {
        EnsureAuthenticated(currentUser);

        var session = await db.Sessions
            .SingleOrDefaultAsync(
                s => s.Id == request.Id && s.UserId == currentUser.UserId && !s.IsDeleted,
                ct);

        if (session is null)
            throw new KeyNotFoundException($"Session '{request.Id}' was not found.");

        session.SetStatus(request.Status);
        await db.SaveChangesAsync(ct);

        return true;
    }

    private static void EnsureAuthenticated(ICurrentUser currentUser)
    {
        if (!currentUser.IsAuthenticated)
            throw new UnauthorizedAccessException();
    }
}
