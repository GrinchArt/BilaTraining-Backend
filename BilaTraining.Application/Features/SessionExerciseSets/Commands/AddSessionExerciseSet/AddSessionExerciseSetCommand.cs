using BilaTraining.Application.Messaging;

namespace BilaTraining.Application.Features.SessionExerciseSets.Commands.AddSessionExerciseSet;

public sealed record AddSessionExerciseSetCommand(
    Guid SessionExerciseId,
    int SetNumber,
    int? Repetitions,
    decimal? Weight,
    string? WeightUnit,
    string? Notes
) : IRequest<Guid>;
