using BilaTraining.Application.Features.WorkspaceClients.Dtos;
using BilaTraining.Application.Messaging;

namespace BilaTraining.Application.Features.WorkspaceClients.Queries.GetWorkspaceClients;

public sealed record GetWorkspaceClientsQuery(Guid WorkspaceId) : IRequest<IReadOnlyList<WorkspaceClientDto>>;
