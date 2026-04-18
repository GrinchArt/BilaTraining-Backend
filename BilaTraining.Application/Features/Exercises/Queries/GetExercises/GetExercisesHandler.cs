using BilaTraining.Application.Abstractions;
using BilaTraining.Application.Features.Exercises.Dtos;
using BilaTraining.Application.Messaging;
using Microsoft.EntityFrameworkCore;

namespace BilaTraining.Application.Features.Exercises.Queries.GetExercises;

public sealed class GetExercisesHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser
) : IRequestHandler<GetExercisesQuery, IReadOnlyList<ExerciseDto>>
{
    public async Task<IReadOnlyList<ExerciseDto>> Handle(GetExercisesQuery request, CancellationToken ct)
    {
        EnsureAuthenticated(currentUser);

        return await db.Exercises
            .AsNoTracking()
            .Where(e => e.UserId == currentUser.UserId && !e.IsDeleted)
            .OrderBy(e => e.Name)
            .Select(e => new ExerciseDto(e.Id, e.Name, e.Category, e.Notes))
            .ToListAsync(ct);
    }

    private static void EnsureAuthenticated(ICurrentUser currentUser)
    {
        if (!currentUser.IsAuthenticated)
            throw new UnauthorizedAccessException();
    }
}
