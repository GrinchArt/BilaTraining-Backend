using BilaTraining.Application.Features.Workspaces.Dtos;
using BilaTraining.Application.Messaging;

namespace BilaTraining.Application.Features.Workspaces.Queries.GetWorkspaceById;

public sealed record GetWorkspaceByIdQuery(Guid Id) : IRequest<WorkspaceDto>;
