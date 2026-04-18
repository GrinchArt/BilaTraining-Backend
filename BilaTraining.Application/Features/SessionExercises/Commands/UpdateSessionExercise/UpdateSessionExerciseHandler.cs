using BilaTraining.Application.Abstractions;
using BilaTraining.Application.Messaging;
using Microsoft.EntityFrameworkCore;

namespace BilaTraining.Application.Features.SessionExercises.Commands.UpdateSessionExercise;

public sealed class UpdateSessionExerciseHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser
) : IRequestHandler<UpdateSessionExerciseCommand, bool>
{
    public async Task<bool> Handle(UpdateSessionExerciseCommand request, CancellationToken ct)
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

        sessionExercise.UpdateDetails(request.SortOrder, request.Notes);
        await db.SaveChangesAsync(ct);

        return true;
    }

    private static void EnsureAuthenticated(ICurrentUser currentUser)
    {
        if (!currentUser.IsAuthenticated)
            throw new UnauthorizedAccessException();
    }
}
