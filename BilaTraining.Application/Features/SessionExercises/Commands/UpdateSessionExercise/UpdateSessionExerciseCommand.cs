using BilaTraining.Application.Messaging;

namespace BilaTraining.Application.Features.SessionExercises.Commands.UpdateSessionExercise;

public sealed record UpdateSessionExerciseCommand(
    Guid Id,
    int SortOrder,
    string? Notes
) : IRequest<bool>;
