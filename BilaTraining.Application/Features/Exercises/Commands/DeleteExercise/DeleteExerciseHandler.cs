using BilaTraining.Application.Abstractions;
using BilaTraining.Application.Messaging;
using Microsoft.EntityFrameworkCore;

namespace BilaTraining.Application.Features.Exercises.Commands.DeleteExercise;

public sealed class DeleteExerciseHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser
) : IRequestHandler<DeleteExerciseCommand, bool>
{
    public async Task<bool> Handle(DeleteExerciseCommand request, CancellationToken ct)
    {
        EnsureAuthenticated(currentUser);

        var exercise = await db.Exercises
            .SingleOrDefaultAsync(
                e => e.Id == request.Id && e.UserId == currentUser.UserId && !e.IsDeleted,
                ct);

        if (exercise is null)
            throw new KeyNotFoundException($"Exercise '{request.Id}' was not found.");

        exercise.SoftDelete();
        await db.SaveChangesAsync(ct);

        return true;
    }

    private static void EnsureAuthenticated(ICurrentUser currentUser)
    {
        if (!currentUser.IsAuthenticated)
            throw new UnauthorizedAccessException();
    }
}
