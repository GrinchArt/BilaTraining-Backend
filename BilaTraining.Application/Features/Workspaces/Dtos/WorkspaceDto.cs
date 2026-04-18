namespace BilaTraining.Application.Features.Workspaces.Dtos;

public sealed record WorkspaceDto(
    Guid Id,
    string Name,
    string? Description,
    string? ColorHex
);
