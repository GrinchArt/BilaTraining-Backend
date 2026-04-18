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

        var query = db.Clients
            .AsNoTracking()
            .Where(c => c.UserId == currentUser.UserId && !c.IsDeleted);

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim();

            query = query.Where(c =>
                c.FirstName.Contains(search) ||
                (c.LastName != null && c.LastName.Contains(search)) ||
                (c.Email != null && c.Email.Contains(search)) ||
                (c.Phone != null && c.Phone.Contains(search)));
        }

        return await query
            .OrderBy(c => c.FirstName)
            .ThenBy(c => c.LastName)
            .Select(c => new ClientDto(c.Id, c.FirstName, c.LastName, c.Phone, c.Email, c.Notes))
            .ToListAsync(ct);
    }

    private static void EnsureAuthenticated(ICurrentUser currentUser)
    {
        if (!currentUser.IsAuthenticated)
            throw new UnauthorizedAccessException();
    }
}
