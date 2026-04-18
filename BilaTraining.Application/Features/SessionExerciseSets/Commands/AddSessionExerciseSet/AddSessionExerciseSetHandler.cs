using BilaTraining.Application.Abstractions;
using BilaTraining.Application.Messaging;
using BilaTraining.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BilaTraining.Application.Features.SessionExerciseSets.Commands.AddSessionExerciseSet;

public sealed class AddSessionExerciseSetHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser
) : IRequestHandler<AddSessionExerciseSetCommand, Guid>
{
    public async Task<Guid> Handle(AddSessionExerciseSetCommand request, CancellationToken ct)
    {
        EnsureAuthenticated(currentUser);

        var sessionExerciseExists = await (
            from setOwner in db.SessionExercises
            join session in db.Sessions on setOwner.SessionId equals session.Id
            where setOwner.Id == request.SessionExerciseId && session.UserId == currentUser.UserId && !session.IsDeleted
            select setOwner.Id)
            .AnyAsync(ct);

        if (!sessionExerciseExists)
            throw new KeyNotFoundException($"Session exercise '{request.SessionExerciseId}' was not found.");

        var set = new SessionExerciseSet(
            request.SessionExerciseId,
            request.SetNumber,
            request.Repetitions,
            request.Weight,
            request.WeightUnit,
            request.Notes);

        db.SessionExerciseSets.Add(set);
        await db.SaveChangesAsync(ct);

        return set.Id;
    }

    private static void EnsureAuthenticated(ICurrentUser currentUser)
    {
        if (!currentUser.IsAuthenticated)
            throw new UnauthorizedAccessException();
    }
}
