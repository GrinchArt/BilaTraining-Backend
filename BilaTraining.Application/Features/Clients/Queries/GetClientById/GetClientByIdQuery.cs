using BilaTraining.Application.Features.Clients.Dtos;
using BilaTraining.Application.Messaging;

namespace BilaTraining.Application.Features.Clients.Queries.GetClientById;

public sealed record GetClientByIdQuery(Guid Id) : IRequest<ClientDto>;
