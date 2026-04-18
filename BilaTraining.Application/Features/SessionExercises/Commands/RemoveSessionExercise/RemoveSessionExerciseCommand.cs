using BilaTraining.Application.Messaging;

namespace BilaTraining.Application.Features.SessionExercises.Commands.RemoveSessionExercise;

public sealed record RemoveSessionExerciseCommand(Guid Id) : IRequest<bool>;
