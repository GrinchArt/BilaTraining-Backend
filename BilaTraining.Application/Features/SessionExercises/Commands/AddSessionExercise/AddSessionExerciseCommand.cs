using BilaTraining.Application.Messaging;

namespace BilaTraining.Application.Features.SessionExercises.Commands.AddSessionExercise;

public sealed record AddSessionExerciseCommand(
    Guid SessionId,
    Guid ExerciseId,
    int SortOrder,
    string? Notes
) : IRequest<Guid>;
