using BilaTraining.Application.Abstractions;
using BilaTraining.Application.Features.SessionExercises.Dtos;
using BilaTraining.Application.Messaging;
using Microsoft.EntityFrameworkCore;

namespace BilaTraining.Application.Features.SessionExercises.Queries.GetSessionExercises;

public sealed class GetSessionExercisesHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser
) : IRequestHandler<GetSessionExercisesQuery, IReadOnlyList<SessionExerciseDto>>
{
    public async Task<IReadOnlyList<SessionExerciseDto>> Handle(GetSessionExercisesQuery request, CancellationToken ct)
    {
        EnsureAuthenticated(currentUser);

        var sessionExists = await db.Sessions.AnyAsync(
            s => s.Id == request.SessionId && s.UserId == currentUser.UserId && !s.IsDeleted,
            ct);

        if (!sessionExists)
            throw new KeyNotFoundException($"Session '{request.SessionId}' was not found.");

        return await db.SessionExercises
            .AsNoTracking()
            .Where(se => se.SessionId == request.SessionId)
            .OrderBy(se => se.SortOrder)
            .ThenBy(se => se.CreatedAtUtc)
            .Select(se => new SessionExerciseDto(
                se.Id,
                se.SessionId,
                se.ExerciseId,
                se.SortOrder,
                se.Notes,
                se.CreatedAtUtc))
            .ToListAsync(ct);
    }

    private static void EnsureAuthenticated(ICurrentUser currentUser)
    {
        if (!currentUser.IsAuthenticated)
            throw new UnauthorizedAccessException();
    }
}
