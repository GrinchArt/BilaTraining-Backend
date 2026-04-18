using BilaTraining.Application.Messaging;

namespace BilaTraining.Application.Features.Exercises.Commands.DeleteExercise;

public sealed record DeleteExerciseCommand(Guid Id) : IRequest<bool>;
