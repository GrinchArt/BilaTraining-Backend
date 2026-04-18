using BilaTraining.Application.Features.SessionExerciseSets.Dtos;
using BilaTraining.Application.Messaging;

namespace BilaTraining.Application.Features.SessionExerciseSets.Queries.GetSessionExerciseSets;

public sealed record GetSessionExerciseSetsQuery(Guid SessionExerciseId) : IRequest<IReadOnlyList<SessionExerciseSetDto>>;
