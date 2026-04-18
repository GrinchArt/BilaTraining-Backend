using BilaTraining.Application.Messaging;

namespace BilaTraining.Application.Features.Sessions.Commands.DeleteSession;

public sealed record DeleteSessionCommand(Guid Id) : IRequest<bool>;
