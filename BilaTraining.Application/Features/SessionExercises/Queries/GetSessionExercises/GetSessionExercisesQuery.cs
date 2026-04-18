using BilaTraining.Application.Features.SessionExercises.Dtos;
using BilaTraining.Application.Messaging;

namespace BilaTraining.Application.Features.SessionExercises.Queries.GetSessionExercises;

public sealed record GetSessionExercisesQuery(Guid SessionId) : IRequest<IReadOnlyList<SessionExerciseDto>>;
