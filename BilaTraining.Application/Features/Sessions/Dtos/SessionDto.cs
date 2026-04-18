using BilaTraining.Domain.Enums;

namespace BilaTraining.Application.Features.Sessions.Dtos;

public sealed record SessionDto(
    Guid Id,
    Guid WorkspaceId,
    Guid ClientId,
    string? Notes,
    DateTime StartAtUtc,
    DateTime EndAtUtc,
    SessionStatus Status
);
