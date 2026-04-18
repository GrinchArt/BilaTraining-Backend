using BilaTraining.Application.Messaging;
using BilaTraining.Domain.Enums;

namespace BilaTraining.Application.Features.Sessions.Commands.UpdateSessionStatus;

public sealed record UpdateSessionStatusCommand(
    Guid Id,
    SessionStatus Status
) : IRequest<bool>;
