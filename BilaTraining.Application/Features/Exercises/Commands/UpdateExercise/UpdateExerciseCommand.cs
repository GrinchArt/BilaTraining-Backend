using BilaTraining.Application.Messaging;

namespace BilaTraining.Application.Features.Exercises.Commands.UpdateExercise;

public sealed record UpdateExerciseCommand(
    Guid Id,
    string Name,
    string? Category,
    string? Notes
) : IRequest<bool>;
