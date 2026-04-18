namespace BilaTraining.Application.Features.WorkspaceClients.Dtos;

public sealed record WorkspaceClientDto(
    Guid WorkspaceId,
    Guid ClientId,
    DateTime AddedAtUtc
);
