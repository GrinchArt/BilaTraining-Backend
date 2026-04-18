using BilaTraining.Application.Abstractions;
using BilaTraining.Application.Messaging;
using BilaTraining.Domain.Entities;

namespace BilaTraining.Application.Features.Clients.Commands.CreateClient;

public sealed class CreateClientHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser
) : IRequestHandler<CreateClientCommand, Guid>
{
    public async Task<Guid> Handle(CreateClientCommand request, CancellationToken ct)
    {
        EnsureAuthenticated(currentUser);

        var client = new Client(currentUser.UserId, request.FirstName, request.LastName);
        client.UpdateContacts(request.Phone, request.Email);
        client.UpdateNotes(request.Notes);

        db.Clients.Add(client);
        await db.SaveChangesAsync(ct);

        return client.Id;
    }

    private static void EnsureAuthenticated(ICurrentUser currentUser)
    {
        if (!currentUser.IsAuthenticated)
            throw new UnauthorizedAccessException();
    }
}
