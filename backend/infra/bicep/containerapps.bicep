param location string
param environment string

@secure()
param sqlConnectionString string
param cosmosEndpoint string
@secure()
param cosmosKey string
@secure()
param redisConnectionString string
@secure()
param serviceBusConnectionString string
@secure()
param signalRConnectionString string

var acaEnvName = 'acaenv-retailfixit-${environment}'
var apiAppName = 'api-retailfixit-${environment}'
var workersAppName = 'workers-retailfixit-${environment}'

// Log Analytics Workspace
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'law-retailfixit-${environment}'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// Container Apps Environment
resource acaEnv 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: acaEnvName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// API Container App
resource apiApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: apiAppName
  location: location
  properties: {
    managedEnvironmentId: acaEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 8080
        transport: 'auto'
        allowInsecure: false
      }
      secrets: [
        {
          name: 'sql-connection'
          value: sqlConnectionString
        }
        {
          name: 'cosmos-key'
          value: cosmosKey
        }
        {
          name: 'redis-connection'
          value: redisConnectionString
        }
        {
          name: 'servicebus-connection'
          value: serviceBusConnectionString
        }
        {
          name: 'signalr-connection'
          value: signalRConnectionString
        }
        {
          name: 'jwt-key'
          value: uniqueString(resourceGroup().id) // Generate a key
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: 'retailfixit/api:${environment}'
          env: [
            {
              name: 'ASPNETCORE_ENVIRONMENT'
              value: environment
            }
            {
              name: 'ConnectionStrings__SqlServer'
              secretRef: 'sql-connection'
            }
            {
              name: 'ConnectionStrings__Redis'
              secretRef: 'redis-connection'
            }
            {
              name: 'Cosmos__Endpoint'
              value: cosmosEndpoint
            }
            {
              name: 'Cosmos__Key'
              secretRef: 'cosmos-key'
            }
            {
              name: 'Cosmos__Database'
              value: 'retailfixit'
            }
            {
              name: 'ServiceBus__ConnectionString'
              secretRef: 'servicebus-connection'
            }
            {
              name: 'ServiceBus__TopicName'
              value: 'events'
            }
            {
              name: 'Jwt__Key'
              secretRef: 'jwt-key'
            }
            {
              name: 'Jwt__Issuer'
              value: 'RetailFixIt'
            }
            {
              name: 'Jwt__Audience'
              value: 'RetailFixIt-Frontend'
            }
          ]
          resources: {
            cpu: json(environment == 'prod' ? '1.0' : '0.5')
            memory: environment == 'prod' ? '2Gi' : '1Gi'
          }
        }
      ]
      scale: {
        minReplicas: environment == 'prod' ? 2 : 1
        maxReplicas: 10
        rules: [
          {
            name: 'http-rule'
            http: {
              metadata: {
                concurrentRequests: '100'
              }
            }
          }
        ]
      }
    }
  }
}

output apiUrl string = 'https://${apiApp.properties.configuration.ingress.fqdn}'
output apiName string = apiApp.name
