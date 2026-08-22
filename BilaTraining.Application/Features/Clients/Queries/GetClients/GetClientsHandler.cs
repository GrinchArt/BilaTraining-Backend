using BilaTraining.Application.Abstractions;
using BilaTraining.Application.Features.Clients.Dtos;
using BilaTraining.Application.Messaging;
using Microsoft.EntityFrameworkCore;

namespace BilaTraining.Application.Features.Clients.Queries.GetClients;

public sealed class GetClientsHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser
) : IRequestHandler<GetClientsQuery, IReadOnlyList<ClientDto>>
{
    public async Task<IReadOnlyList<ClientDto>> Handle(GetClientsQuery request, CancellationToken ct)
    {
        EnsureAuthenticated(currentUser);

        var query =
            from client in db.Clients.AsNoTracking()
            join relationship in db.CoachClientRelationships.AsNoTracking()
                on new { CoachUserId = client.UserId, ClientId = client.Id }
                equals new { relationship.CoachUserId, relationship.ClientId }
                into relationships
            from relationship in relationships.DefaultIfEmpty()
            where client.UserId == currentUser.UserId && !client.IsDeleted
            select new { Client = client, Relationship = relationship };

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim();

            query = query.Where(item =>
                item.Client.FirstName.Contains(search) ||
                (item.Client.LastName != null && item.Client.LastName.Contains(search)) ||
                (item.Client.Email != null && item.Client.Email.Contains(search)) ||
                (item.Client.Phone != null && item.Client.Phone.Contains(search)));
        }

        return await query
            .OrderBy(item => item.Client.FirstName)
            .ThenBy(item => item.Client.LastName)
            .Select(item => new ClientDto(
                item.Client.Id,
                item.Client.FirstName,
                item.Client.LastName,
                item.Client.Phone,
                item.Client.Email,
                item.Client.Notes,
                item.Relationship == null
                    ? Domain.Enums.CoachClientRelationshipStatus.Managed
                    : item.Relationship.Status,
                item.Client.LinkedUserId.HasValue))
            .ToListAsync(ct);
    }

    private static void EnsureAuthenticated(ICurrentUser currentUser)
    {
        if (!currentUser.IsAuthenticated)
            throw new UnauthorizedAccessException();
    }
}
