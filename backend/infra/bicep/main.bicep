targetScope = 'subscription'

@description('Environment name')
param environment string = 'dev'

@description('Primary region')
param location string = 'eastus'

@description('Secondary region for failover')
param secondaryLocation string = 'westus2'

@description('Resource group name')
param resourceGroupName string = 'rg-retailfixit-${environment}'

// Resource Group
resource rg 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: resourceGroupName
  location: location
  tags: {
    Environment: environment
    Project: 'RetailFixIt'
    ManagedBy: 'Bicep'
  }
}

// SQL Server
module sql 'sql.bicep' = {
  name: 'sql-module'
  scope: rg
  params: {
    location: location
    environment: environment
    adminLogin: sqlAdminLogin
    adminPassword: sqlAdminPassword
  }
}

// Cosmos DB
module cosmos 'cosmos.bicep' = {
  name: 'cosmos-module'
  scope: rg
  params: {
    location: location
    secondaryLocation: secondaryLocation
    environment: environment
  }
}

// Redis Cache
module redis 'redis.bicep' = {
  name: 'redis-module'
  scope: rg
  params: {
    location: location
    environment: environment
  }
}

// Service Bus
module serviceBus 'servicebus.bicep' = {
  name: 'servicebus-module'
  scope: rg
  params: {
    location: location
    environment: environment
  }
}

// SignalR
module signalr 'signalr.bicep' = {
  name: 'signalr-module'
  scope: rg
  params: {
    location: location
    environment: environment
  }
}

// Container Apps Environment & API
module containerApps 'containerapps.bicep' = {
  name: 'containerapps-module'
  scope: rg
  params: {
    location: location
    environment: environment
    sqlConnectionString: sql.outputs.connectionString
    cosmosEndpoint: cosmos.outputs.endpoint
    cosmosKey: cosmos.outputs.key
    redisConnectionString: redis.outputs.connectionString
    serviceBusConnectionString: serviceBus.outputs.connectionString
    signalRConnectionString: signalr.outputs.connectionString
  }
}

// Application Insights
module appInsights 'monitoring.bicep' = {
  name: 'monitoring-module'
  scope: rg
  params: {
    location: location
    environment: environment
  }
}

// Key Vault
module keyVault 'keyvault.bicep' = {
  name: 'keyvault-module'
  scope: rg
  params: {
    location: location
    environment: environment
    sqlConnectionString: sql.outputs.connectionString
    cosmosKey: cosmos.outputs.key
    redisKey: redis.outputs.key
    serviceBusConnectionString: serviceBus.outputs.connectionString
  }
}

// Parameters (should be passed via Key Vault or secure params in production)
@secure()
param sqlAdminLogin string
@secure()
param sqlAdminPassword string

// Outputs
output sqlServerFqdn string = sql.outputs.fqdn
output cosmosEndpoint string = cosmos.outputs.endpoint
output apiUrl string = containerApps.outputs.apiUrl
output keyVaultName string = keyVault.outputs.name
