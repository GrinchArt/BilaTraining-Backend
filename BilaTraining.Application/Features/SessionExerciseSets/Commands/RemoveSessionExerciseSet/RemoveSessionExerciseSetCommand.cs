using BilaTraining.Application.Messaging;

namespace BilaTraining.Application.Features.SessionExerciseSets.Commands.RemoveSessionExerciseSet;

public sealed record RemoveSessionExerciseSetCommand(Guid Id) : IRequest<bool>;
