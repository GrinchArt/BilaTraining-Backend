using BilaTraining.Application.Abstractions;
using BilaTraining.Application.Messaging;
using BilaTraining.Domain.Entities;

namespace BilaTraining.Application.Features.Exercises.Commands.CreateExercise;

public sealed class CreateExerciseHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser
) : IRequestHandler<CreateExerciseCommand, Guid>
{
    public async Task<Guid> Handle(CreateExerciseCommand request, CancellationToken ct)
    {
        EnsureAuthenticated(currentUser);

        var exercise = new Exercise(currentUser.UserId, request.Name, request.Category);
        exercise.UpdateDetails(request.Name, request.Category, request.Notes);

        db.Exercises.Add(exercise);
        await db.SaveChangesAsync(ct);

        return exercise.Id;
    }

    private static void EnsureAuthenticated(ICurrentUser currentUser)
    {
        if (!currentUser.IsAuthenticated)
            throw new UnauthorizedAccessException();
    }
}
