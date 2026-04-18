using BilaTraining.Application.Features.Sessions.Dtos;
using BilaTraining.Application.Messaging;

namespace BilaTraining.Application.Features.Sessions.Queries.GetSessionById;

public sealed record GetSessionByIdQuery(Guid Id) : IRequest<SessionDto>;
