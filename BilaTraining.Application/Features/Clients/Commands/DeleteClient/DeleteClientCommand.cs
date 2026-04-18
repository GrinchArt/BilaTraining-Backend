using BilaTraining.Application.Messaging;

namespace BilaTraining.Application.Features.Clients.Commands.DeleteClient;

public sealed record DeleteClientCommand(Guid Id) : IRequest<bool>;
