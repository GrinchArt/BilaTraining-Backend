FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY BilaTraining.Api/BilaTraining.Api.csproj BilaTraining.Api/
COPY BilaTraining.Application/BilaTraining.Application.csproj BilaTraining.Application/
COPY BilaTraining.Domain/BilaTraining.Domain.csproj BilaTraining.Domain/
COPY BilaTraining.Infrastructure/BilaTraining.Infrastructure.csproj BilaTraining.Infrastructure/

RUN dotnet restore BilaTraining.Api/BilaTraining.Api.csproj

COPY . .
RUN dotnet publish BilaTraining.Api/BilaTraining.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

ENV ASPNETCORE_URLS=http://0.0.0.0:10000
EXPOSE 10000

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "BilaTraining.Api.dll"]
