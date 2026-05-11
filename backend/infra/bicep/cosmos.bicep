param location string
param secondaryLocation string
param environment string

var accountName = 'cosmos-retailfixit-${environment}-${uniqueString(resourceGroup().id)}'

resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2023-11-15' = {
  name: accountName
  location: location
  tags: {
    Environment: environment
  }
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
      {
        locationName: secondaryLocation
        failoverPriority: 1
        isZoneRedundant: false
      }
    ]
    capabilities: []
    enableFreeTier: environment == 'dev'
    enableAutomaticFailover: true
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
      maxIntervalInSeconds: 5
      maxStalenessPrefix: 100
    }
    publicNetworkAccess: 'Enabled'
    ipRules: []
    backupPolicy: {
      type: 'Periodic'
      periodicModeProperties: {
        backupIntervalInMinutes: 240
        backupRetentionIntervalInHours: 8
        backupStorageRedundancy: 'Local'
      }
    }
  }

  // Database
  resource database 'sqlDatabases' = {
    name: 'retailfixit'
    properties: {
      resource: {
        id: 'retailfixit'
      }
    }

    // Audit container
    resource auditContainer 'containers' = {
      name: 'audit'
      properties: {
        resource: {
          id: 'audit'
          partitionKey: {
            paths: [
              '/tenantId'
            ]
            kind: 'Hash'
            version: 2
          }
          indexingPolicy: {
            indexingMode: 'consistent'
            automatic: true
            includedPaths: [
              {
                path: '/*'
              }
            ]
            excludedPaths: [
              {
                path: '/"_etag"/?'
              }
            ]
          }
        }
        options: {
          throughput: environment == 'prod' ? 1000 : 400
        }
      }
    }

    // AI Recommendations container
    resource aiContainer 'containers' = {
      name: 'airecommendations'
      properties: {
        resource: {
          id: 'airecommendations'
          partitionKey: {
            paths: [
              '/tenantId'
            ]
            kind: 'Hash'
            version: 2
          }
        }
        options: {
          throughput: environment == 'prod' ? 1000 : 400
        }
      }
    }
  }
}

output endpoint string = cosmosAccount.properties.documentEndpoint
output key string = cosmosAccount.listKeys().primaryMasterKey
output name string = cosmosAccount.name
