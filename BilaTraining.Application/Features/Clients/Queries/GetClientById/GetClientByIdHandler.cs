using BilaTraining.Application.Abstractions;
using BilaTraining.Application.Features.Clients.Dtos;
using BilaTraining.Application.Messaging;
using Microsoft.EntityFrameworkCore;

namespace BilaTraining.Application.Features.Clients.Queries.GetClientById;

public sealed class GetClientByIdHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser
) : IRequestHandler<GetClientByIdQuery, ClientDto>
{
    public async Task<ClientDto> Handle(GetClientByIdQuery request, CancellationToken ct)
    {
        EnsureAuthenticated(currentUser);

        var client = await (
            from item in db.Clients.AsNoTracking()
            join relationship in db.CoachClientRelationships.AsNoTracking()
                on new { CoachUserId = item.UserId, ClientId = item.Id }
                equals new { relationship.CoachUserId, relationship.ClientId }
                into relationships
            from relationship in relationships.DefaultIfEmpty()
            where item.Id == request.Id && item.UserId == currentUser.UserId && !item.IsDeleted
            select new ClientDto(
                item.Id,
                item.FirstName,
                item.LastName,
                item.Phone,
                item.Email,
                item.Notes,
                relationship == null
                    ? Domain.Enums.CoachClientRelationshipStatus.Managed
                    : relationship.Status,
                item.LinkedUserId.HasValue))
            .SingleOrDefaultAsync(ct);

        return client ?? throw new KeyNotFoundException($"Client '{request.Id}' was not found.");
    }

    private static void EnsureAuthenticated(ICurrentUser currentUser)
    {
        if (!currentUser.IsAuthenticated)
            throw new UnauthorizedAccessException();
    }
}
