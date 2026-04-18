using BilaTraining.Application.Features.Exercises.Dtos;
using BilaTraining.Application.Messaging;

namespace BilaTraining.Application.Features.Exercises.Queries.GetExerciseById;

public sealed record GetExerciseByIdQuery(Guid Id) : IRequest<ExerciseDto>;
