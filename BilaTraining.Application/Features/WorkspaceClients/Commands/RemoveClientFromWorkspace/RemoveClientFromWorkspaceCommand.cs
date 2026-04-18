using BilaTraining.Application.Messaging;

namespace BilaTraining.Application.Features.WorkspaceClients.Commands.RemoveClientFromWorkspace;

public sealed record RemoveClientFromWorkspaceCommand(
    Guid WorkspaceId,
    Guid ClientId
) : IRequest<bool>;
