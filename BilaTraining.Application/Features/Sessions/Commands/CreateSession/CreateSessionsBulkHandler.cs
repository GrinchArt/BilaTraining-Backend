using BilaTraining.Application.Abstractions;
using BilaTraining.Application.Messaging;
using BilaTraining.Domain.Entities;

namespace BilaTraining.Application.Features.Sessions.Commands.CreateSession;

public sealed class CreateSessionsBulkHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser
) : IRequestHandler<CreateSessionsBulkCommand, IReadOnlyList<Guid>>
{
    public async Task<IReadOnlyList<Guid>> Handle(CreateSessionsBulkCommand request, CancellationToken ct)
    {
        CreateSessionHandler.EnsureAuthenticated(currentUser);

        if (request.Sessions.Count == 0)
            throw new ArgumentException("At least one session is required.");

        await CreateSessionHandler.EnsureOwnedSessionRelationsAsync(
            request.WorkspaceId,
            request.ClientId,
            db,
            currentUser,
            ct);

        var sessions = request.Sessions
            .Select(item =>
            {
                var session = new Session(
                    currentUser.UserId,
                    request.WorkspaceId,
                    request.ClientId,
                    item.StartAtUtc,
                    item.EndAtUtc,
                    request.Notes);

                CreateSessionHandler.ApplyRequestedStatus(session, request.Status);
                return session;
            })
            .ToArray();

        db.Sessions.AddRange(sessions);
        await db.SaveChangesAsync(ct);

        return sessions.Select(session => session.Id).ToArray();
    }
}
