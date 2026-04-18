using Microsoft.Extensions.DependencyInjection;

namespace BilaTraining.Application.Messaging;

public sealed class Dispatcher(IServiceProvider serviceProvider) : IDispatcher
{
    public Task<TResponse> Send<TResponse>(IRequest<TResponse> request, CancellationToken ct = default)
    {
        var handlerType = typeof(IRequestHandler<,>).MakeGenericType(request.GetType(), typeof(TResponse));
        var handler = serviceProvider.GetRequiredService(handlerType);

        var method = handlerType.GetMethod("Handle")!;
        return (Task<TResponse>)method.Invoke(handler, new object[] { request, ct })!;
    }
}
