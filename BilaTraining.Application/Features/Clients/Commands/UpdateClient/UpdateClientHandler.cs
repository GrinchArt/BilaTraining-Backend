using BilaTraining.Application.Abstractions;
using BilaTraining.Application.Messaging;
using Microsoft.EntityFrameworkCore;

namespace BilaTraining.Application.Features.Clients.Commands.UpdateClient;

public sealed class UpdateClientHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser
) : IRequestHandler<UpdateClientCommand, bool>
{
    public async Task<bool> Handle(UpdateClientCommand request, CancellationToken ct)
    {
        EnsureAuthenticated(currentUser);

        var client = await db.Clients
            .SingleOrDefaultAsync(
                c => c.Id == request.Id && c.UserId == currentUser.UserId && !c.IsDeleted,
                ct);

        if (client is null)
            throw new KeyNotFoundException($"Client '{request.Id}' was not found.");

        client.UpdateProfile(
            request.FirstName,
            request.LastName,
            request.Phone,
            request.Email,
            request.Notes);

        await db.SaveChangesAsync(ct);
        return true;
    }

    private static void EnsureAuthenticated(ICurrentUser currentUser)
    {
        if (!currentUser.IsAuthenticated)
            throw new UnauthorizedAccessException();
    }
}
