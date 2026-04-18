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

        var client = await db.Clients
            .AsNoTracking()
            .Where(c => c.Id == request.Id && c.UserId == currentUser.UserId && !c.IsDeleted)
            .Select(c => new ClientDto(c.Id, c.FirstName, c.LastName, c.Phone, c.Email, c.Notes))
            .SingleOrDefaultAsync(ct);

        return client ?? throw new KeyNotFoundException($"Client '{request.Id}' was not found.");
    }

    private static void EnsureAuthenticated(ICurrentUser currentUser)
    {
        if (!currentUser.IsAuthenticated)
            throw new UnauthorizedAccessException();
    }
}
