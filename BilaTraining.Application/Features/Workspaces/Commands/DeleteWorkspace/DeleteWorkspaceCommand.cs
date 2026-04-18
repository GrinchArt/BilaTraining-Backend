using BilaTraining.Application.Messaging;

namespace BilaTraining.Application.Features.Workspaces.Commands.DeleteWorkspace;

public sealed record DeleteWorkspaceCommand(Guid Id) : IRequest<bool>;
