using BilaTraining.Application.Features.Workspaces.Dtos;
using BilaTraining.Application.Messaging;

namespace BilaTraining.Application.Features.Workspaces.Queries.GetWorkspaces;

public sealed record GetWorkspacesQuery(string? Search = null) : IRequest<IReadOnlyList<WorkspaceDto>>;
