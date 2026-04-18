using BilaTraining.Application.Abstractions;
using BilaTraining.Application.Messaging;
using Microsoft.EntityFrameworkCore;

namespace BilaTraining.Application.Features.SessionExercises.Commands.RemoveSessionExercise;

public sealed class RemoveSessionExerciseHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser
) : IRequestHandler<RemoveSessionExerciseCommand, bool>
{
    public async Task<bool> Handle(RemoveSessionExerciseCommand request, CancellationToken ct)
    {
        EnsureAuthenticated(currentUser);

        var sessionExercise = await (
            from se in db.SessionExercises
            join s in db.Sessions on se.SessionId equals s.Id
            where se.Id == request.Id && s.UserId == currentUser.UserId && !s.IsDeleted
            select se)
            .SingleOrDefaultAsync(ct);

        if (sessionExercise is null)
            throw new KeyNotFoundException($"Session exercise '{request.Id}' was not found.");

        db.SessionExercises.Remove(sessionExercise);
        await db.SaveChangesAsync(ct);

        return true;
    }

    private static void EnsureAuthenticated(ICurrentUser currentUser)
    {
        if (!currentUser.IsAuthenticated)
            throw new UnauthorizedAccessException();
    }
}
