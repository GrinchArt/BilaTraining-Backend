using BilaTraining.Domain.Enums;

namespace BilaTraining.Application.Features.Reports.Dtos;

public sealed record SessionOverviewStatusDto(
    SessionStatus Status,
    int Count
);
