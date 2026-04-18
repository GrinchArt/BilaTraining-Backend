using BilaTraining.Application.Abstractions;
using BilaTraining.Application.Features.SessionExerciseSets.Dtos;
using BilaTraining.Application.Messaging;
using Microsoft.EntityFrameworkCore;

namespace BilaTraining.Application.Features.SessionExerciseSets.Queries.GetSessionExerciseSets;

public sealed class GetSessionExerciseSetsHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser
) : IRequestHandler<GetSessionExerciseSetsQuery, IReadOnlyList<SessionExerciseSetDto>>
{
    public async Task<IReadOnlyList<SessionExerciseSetDto>> Handle(GetSessionExerciseSetsQuery request, CancellationToken ct)
    {
        EnsureAuthenticated(currentUser);

        var sessionExerciseExists = await (
            from se in db.SessionExercises
            join s in db.Sessions on se.SessionId equals s.Id
            where se.Id == request.SessionExerciseId && s.UserId == currentUser.UserId && !s.IsDeleted
            select se.Id)
            .AnyAsync(ct);

        if (!sessionExerciseExists)
            throw new KeyNotFoundException($"Session exercise '{request.SessionExerciseId}' was not found.");

        return await db.SessionExerciseSets
            .AsNoTracking()
            .Where(ses => ses.SessionExerciseId == request.SessionExerciseId)
            .OrderBy(ses => ses.SetNumber)
            .Select(ses => new SessionExerciseSetDto(
                ses.Id,
                ses.SessionExerciseId,
                ses.SetNumber,
                ses.Repetitions,
                ses.Weight,
                ses.WeightUnit,
                ses.Notes))
            .ToListAsync(ct);
    }

    private static void EnsureAuthenticated(ICurrentUser currentUser)
    {
        if (!currentUser.IsAuthenticated)
            throw new UnauthorizedAccessException();
    }
}
