using BilaTraining.Application.Messaging;
using Microsoft.Extensions.DependencyInjection;
using System.Reflection;

namespace BilaTraining.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IDispatcher, Dispatcher>();

        var assembly = Assembly.GetExecutingAssembly();
        var handlerInterface = typeof(IRequestHandler<,>);

        foreach (var type in assembly.GetTypes().Where(t => t is { IsAbstract: false, IsInterface: false }))
        {
            var interfaces = type.GetInterfaces()
                .Where(i => i.IsGenericType && i.GetGenericTypeDefinition() == handlerInterface);

            foreach (var @interface in interfaces)
            {
                services.AddScoped(@interface, type);
            }
        }

        return services;
    }
}
