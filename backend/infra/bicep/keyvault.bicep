param location string
param environment string

@secure()
param sqlConnectionString string
@secure()
param cosmosKey string
@secure()
param redisKey string
@secure()
param serviceBusConnectionString string

var vaultName = 'kv-retailfixit-${environment}-${uniqueString(resourceGroup().id)}'

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: vaultName
  location: location
  tags: {
    Environment: environment
  }
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    accessPolicies: []
    enabledForDeployment: false
    enabledForDiskEncryption: false
    enabledForTemplateDeployment: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    enableRbacAuthorization: true
    publicNetworkAccess: 'Enabled'
  }

  // Secrets
  resource sqlSecret 'secrets' = {
    name: 'sql-connection-string'
    properties: {
      value: sqlConnectionString
    }
  }

  resource cosmosSecret 'secrets' = {
    name: 'cosmos-key'
    properties: {
      value: cosmosKey
    }
  }

  resource redisSecret 'secrets' = {
    name: 'redis-key'
    properties: {
      value: redisKey
    }
  }

  resource serviceBusSecret 'secrets' = {
    name: 'servicebus-connection-string'
    properties: {
      value: serviceBusConnectionString
    }
  }
}

output name string = keyVault.name
output uri string = keyVault.properties.vaultUri
