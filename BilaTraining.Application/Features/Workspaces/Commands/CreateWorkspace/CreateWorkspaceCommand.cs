using BilaTraining.Application.Messaging;

namespace BilaTraining.Application.Features.Workspaces.Commands.CreateWorkspace;

public sealed record CreateWorkspaceCommand(
    string Name,
    string? Description,
    string? ColorHex
) : IRequest<Guid>;
