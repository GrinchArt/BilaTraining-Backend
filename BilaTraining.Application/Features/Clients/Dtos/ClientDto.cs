namespace BilaTraining.Application.Features.Clients.Dtos;

public sealed record ClientDto(
    Guid Id,
    string FirstName,
    string? LastName,
    string? Phone,
    string? Email,
    string? Notes
);
