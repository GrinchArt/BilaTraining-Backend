using BilaTraining.Application.Features.Clients.Dtos;
using BilaTraining.Application.Messaging;

namespace BilaTraining.Application.Features.Clients.Queries.GetClients;

public sealed record GetClientsQuery(string? Search = null) : IRequest<IReadOnlyList<ClientDto>>;
