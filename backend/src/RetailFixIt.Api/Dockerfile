# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj and restore dependencies
COPY *.csproj ./
RUN dotnet restore

# Copy everything else and build
COPY . ./
RUN dotnet publish -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Create data directory for SQLite
RUN mkdir -p /app/data

# Copy published files
COPY --from=build /app/publish ./

# Expose port
EXPOSE 8080

# Set environment
ENV ASPNETCORE_URLS=http://+:8080
ENV DATABASE__PROVIDER=Sqlite
ENV DATABASE__CONNECTIONSTRING=Data Source=/app/data/retailfixit.db

# Run the app
ENTRYPOINT ["dotnet", "RetailFixIt.Api.dll"]
