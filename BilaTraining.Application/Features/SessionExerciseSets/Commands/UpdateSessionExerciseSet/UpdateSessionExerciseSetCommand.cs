using BilaTraining.Application.Messaging;

namespace BilaTraining.Application.Features.SessionExerciseSets.Commands.UpdateSessionExerciseSet;

public sealed record UpdateSessionExerciseSetCommand(
    Guid Id,
    int SetNumber,
    int? Repetitions,
    decimal? Weight,
    string? WeightUnit,
    string? Notes
) : IRequest<bool>;
