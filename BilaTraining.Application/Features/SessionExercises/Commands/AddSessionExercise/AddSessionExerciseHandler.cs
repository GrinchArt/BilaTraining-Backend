using BilaTraining.Application.Abstractions;
using BilaTraining.Application.Messaging;
using BilaTraining.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BilaTraining.Application.Features.SessionExercises.Commands.AddSessionExercise;

public sealed class AddSessionExerciseHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser
) : IRequestHandler<AddSessionExerciseCommand, Guid>
{
    public async Task<Guid> Handle(AddSessionExerciseCommand request, CancellationToken ct)
    {
        EnsureAuthenticated(currentUser);
        await EnsureOwnedSessionAndExerciseAsync(request.SessionId, request.ExerciseId, db, currentUser, ct);

        var sessionExercise = new SessionExercise(
            request.SessionId,
            request.ExerciseId,
            request.SortOrder,
            request.Notes);

        db.SessionExercises.Add(sessionExercise);
        await db.SaveChangesAsync(ct);

        return sessionExercise.Id;
    }

    internal static async Task EnsureOwnedSessionAndExerciseAsync(
        Guid sessionId,
        Guid exerciseId,
        IApplicationDbContext db,
        ICurrentUser currentUser,
        CancellationToken ct)
    {
        var sessionExists = await db.Sessions.AnyAsync(
            s => s.Id == sessionId && s.UserId == currentUser.UserId && !s.IsDeleted,
            ct);

        if (!sessionExists)
            throw new KeyNotFoundException($"Session '{sessionId}' was not found.");

        var exerciseExists = await db.Exercises.AnyAsync(
            e => e.Id == exerciseId && e.UserId == currentUser.UserId && !e.IsDeleted,
            ct);

        if (!exerciseExists)
            throw new KeyNotFoundException($"Exercise '{exerciseId}' was not found.");
    }

    private static void EnsureAuthenticated(ICurrentUser currentUser)
    {
        if (!currentUser.IsAuthenticated)
            throw new UnauthorizedAccessException();
    }
}
