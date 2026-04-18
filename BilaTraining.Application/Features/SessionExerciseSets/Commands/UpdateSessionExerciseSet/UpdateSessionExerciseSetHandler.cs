using BilaTraining.Application.Abstractions;
using BilaTraining.Application.Messaging;
using Microsoft.EntityFrameworkCore;

namespace BilaTraining.Application.Features.SessionExerciseSets.Commands.UpdateSessionExerciseSet;

public sealed class UpdateSessionExerciseSetHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser
) : IRequestHandler<UpdateSessionExerciseSetCommand, bool>
{
    public async Task<bool> Handle(UpdateSessionExerciseSetCommand request, CancellationToken ct)
    {
        EnsureAuthenticated(currentUser);

        var set = await (
            from ses in db.SessionExerciseSets
            join se in db.SessionExercises on ses.SessionExerciseId equals se.Id
            join s in db.Sessions on se.SessionId equals s.Id
            where ses.Id == request.Id && s.UserId == currentUser.UserId && !s.IsDeleted
            select ses)
            .SingleOrDefaultAsync(ct);

        if (set is null)
            throw new KeyNotFoundException($"Session exercise set '{request.Id}' was not found.");

        set.UpdateDetails(
            request.SetNumber,
            request.Repetitions,
            request.Weight,
            request.WeightUnit,
            request.Notes);

        await db.SaveChangesAsync(ct);
        return true;
    }

    private static void EnsureAuthenticated(ICurrentUser currentUser)
    {
        if (!currentUser.IsAuthenticated)
            throw new UnauthorizedAccessException();
    }
}
