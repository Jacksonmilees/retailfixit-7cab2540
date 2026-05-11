using Microsoft.Azure.Cosmos;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using RetailFixIt.Infrastructure.Cosmos;
using RetailFixIt.Infrastructure.Data;
using RetailFixIt.Infrastructure.OpenAI;
using RetailFixIt.Infrastructure.Redis;
using RetailFixIt.Infrastructure.ServiceBus;
using StackExchange.Redis;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureAppConfiguration((context, config) =>
    {
        config.AddJsonFile("appsettings.json", optional: true);
        config.AddJsonFile($"appsettings.{context.HostingEnvironment.EnvironmentName}.json", optional: true);
        config.AddEnvironmentVariables();
        config.AddUserSecrets<Program>();
    })
    .ConfigureServices((context, services) =>
    {
        var configuration = context.Configuration;

        // EF Core
        services.AddDbContext<RetailFixItDbContext>(options =>
        {
            options.UseSqlServer(configuration.GetConnectionString("SqlServer"), sqlOptions =>
            {
                sqlOptions.EnableRetryOnFailure(6);
            });
            options.AddInterceptors(new TenantDbConnectionInterceptor());
        });

        // Redis
        services.AddSingleton<IConnectionMultiplexer>(sp =>
            ConnectionMultiplexer.Connect(configuration.GetConnectionString("Redis")!));
        services.AddScoped<IRedisCache, RedisCache>();

        // Cosmos DB
        services.AddSingleton(sp =>
        {
            var cosmosClient = new CosmosClient(
                configuration["Cosmos:Endpoint"]!,
                configuration["Cosmos:Key"]!);
            return cosmosClient;
        });
        services.AddScoped<CosmosDbContext>(sp =>
        {
            var client = sp.GetRequiredService<CosmosClient>();
            return new CosmosDbContext(client, configuration["Cosmos:Database"]!, "audit");
        });

        // Service Bus
        services.AddSingleton<Azure.Messaging.ServiceBus.ServiceBusClient>(sp =>
            new Azure.Messaging.ServiceBus.ServiceBusClient(configuration.GetConnectionString("ServiceBus")));
        services.AddScoped<IEventPublisher>(sp =>
        {
            var client = sp.GetRequiredService<Azure.Messaging.ServiceBus.ServiceBusClient>();
            return new ServiceBusEventPublisher(client, configuration["ServiceBus:TopicName"] ?? "events");
        });

        // OpenAI
        services.AddSingleton<IOpenAIClient>(sp =>
            new AzureOpenAIClient(
                configuration["OpenAI:Endpoint"]!,
                configuration["OpenAI:Key"]!));
    })
    .Build();

host.Run();
