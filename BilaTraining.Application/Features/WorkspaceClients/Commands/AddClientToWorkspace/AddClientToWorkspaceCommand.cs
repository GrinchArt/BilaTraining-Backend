using BilaTraining.Application.Messaging;

namespace BilaTraining.Application.Features.WorkspaceClients.Commands.AddClientToWorkspace;

public sealed record AddClientToWorkspaceCommand(
    Guid WorkspaceId,
    Guid ClientId
) : IRequest<bool>;
