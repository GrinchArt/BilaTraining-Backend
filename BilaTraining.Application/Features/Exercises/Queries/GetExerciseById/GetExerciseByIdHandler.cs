using BilaTraining.Application.Abstractions;
using BilaTraining.Application.Features.Exercises.Dtos;
using BilaTraining.Application.Messaging;
using Microsoft.EntityFrameworkCore;

namespace BilaTraining.Application.Features.Exercises.Queries.GetExerciseById;

public sealed class GetExerciseByIdHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser
) : IRequestHandler<GetExerciseByIdQuery, ExerciseDto>
{
    public async Task<ExerciseDto> Handle(GetExerciseByIdQuery request, CancellationToken ct)
    {
        EnsureAuthenticated(currentUser);

        var exercise = await db.Exercises
            .AsNoTracking()
            .Where(e => e.Id == request.Id && e.UserId == currentUser.UserId && !e.IsDeleted)
            .Select(e => new ExerciseDto(e.Id, e.Name, e.Category, e.Notes))
            .SingleOrDefaultAsync(ct);

        return exercise ?? throw new KeyNotFoundException($"Exercise '{request.Id}' was not found.");
    }

    private static void EnsureAuthenticated(ICurrentUser currentUser)
    {
        if (!currentUser.IsAuthenticated)
            throw new UnauthorizedAccessException();
    }
}
