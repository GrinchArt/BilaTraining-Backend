using BilaTraining.Application.Messaging;

namespace BilaTraining.Application.Features.Exercises.Commands.CreateExercise;

public sealed record CreateExerciseCommand(
    string Name,
    string? Category,
    string? Notes
) : IRequest<Guid>;
