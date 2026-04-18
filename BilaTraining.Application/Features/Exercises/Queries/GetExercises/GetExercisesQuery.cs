using BilaTraining.Application.Features.Exercises.Dtos;
using BilaTraining.Application.Messaging;

namespace BilaTraining.Application.Features.Exercises.Queries.GetExercises;

public sealed record GetExercisesQuery() : IRequest<IReadOnlyList<ExerciseDto>>;
