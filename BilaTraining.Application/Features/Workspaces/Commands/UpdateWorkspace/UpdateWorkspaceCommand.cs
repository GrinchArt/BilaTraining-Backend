using BilaTraining.Application.Messaging;

namespace BilaTraining.Application.Features.Workspaces.Commands.UpdateWorkspace;

public sealed record UpdateWorkspaceCommand(
    Guid Id,
    string Name,
    string? Description,
    string? ColorHex
) : IRequest<bool>;
