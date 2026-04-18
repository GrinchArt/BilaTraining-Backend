using BilaTraining.Application.Abstractions;
using BilaTraining.Application.Messaging;
using Microsoft.EntityFrameworkCore;

namespace BilaTraining.Application.Features.Clients.Commands.DeleteClient;

public sealed class DeleteClientHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser
) : IRequestHandler<DeleteClientCommand, bool>
{
    public async Task<bool> Handle(DeleteClientCommand request, CancellationToken ct)
    {
        EnsureAuthenticated(currentUser);

        var client = await db.Clients
            .SingleOrDefaultAsync(
                c => c.Id == request.Id && c.UserId == currentUser.UserId && !c.IsDeleted,
                ct);

        if (client is null)
            throw new KeyNotFoundException($"Client '{request.Id}' was not found.");

        client.SoftDelete();
        await db.SaveChangesAsync(ct);

        return true;
    }

    private static void EnsureAuthenticated(ICurrentUser currentUser)
    {
        if (!currentUser.IsAuthenticated)
            throw new UnauthorizedAccessException();
    }
}
