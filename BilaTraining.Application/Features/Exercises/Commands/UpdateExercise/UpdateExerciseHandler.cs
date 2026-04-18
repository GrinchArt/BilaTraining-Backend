using BilaTraining.Application.Abstractions;
using BilaTraining.Application.Messaging;
using Microsoft.EntityFrameworkCore;

namespace BilaTraining.Application.Features.Exercises.Commands.UpdateExercise;

public sealed class UpdateExerciseHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser
) : IRequestHandler<UpdateExerciseCommand, bool>
{
    public async Task<bool> Handle(UpdateExerciseCommand request, CancellationToken ct)
    {
        EnsureAuthenticated(currentUser);

        var exercise = await db.Exercises
            .SingleOrDefaultAsync(
                e => e.Id == request.Id && e.UserId == currentUser.UserId && !e.IsDeleted,
                ct);

        if (exercise is null)
            throw new KeyNotFoundException($"Exercise '{request.Id}' was not found.");

        exercise.UpdateDetails(request.Name, request.Category, request.Notes);
        await db.SaveChangesAsync(ct);

        return true;
    }

    private static void EnsureAuthenticated(ICurrentUser currentUser)
    {
        if (!currentUser.IsAuthenticated)
            throw new UnauthorizedAccessException();
    }
}
