// Simple Free Tier Deployment for RetailFixIt
// No external modules - native Azure resources only

targetScope = 'resourceGroup'

param location string = resourceGroup().location
param environment string = 'dev'
param acrName string = 'retailfixitacr${uniqueString(resourceGroup().id)}'

// Container Registry - Basic tier (low cost, ~$5/month)
resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
  }
}

// Log Analytics Workspace (pay-as-you-go, minimal cost for dev)
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'log-retailfixit-${environment}'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// Container Apps Environment
resource containerAppEnv 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: 'cae-retailfixit-${environment}'
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

// Container App - API (scale to zero, pay per use)
resource apiContainerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'api-retailfixit-${environment}'
  location: location
  properties: {
    managedEnvironmentId: containerAppEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8080
        transport: 'auto'
        corsPolicy: {
          allowedOrigins: ['*']
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
          allowedHeaders: ['*']
          maxAge: 3600
        }
      }
      registries: [
        {
          server: acr.properties.loginServer
          username: acr.name
          passwordSecretRef: 'registry-password'
        }
      ]
      secrets: [
        {
          name: 'registry-password'
          value: acr.listCredentials().passwords[0].value
        }
      ]
    }
    template: {
      containers: [
        {
          image: '${acr.properties.loginServer}/retailfixit-api:latest'
          name: 'api'
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            {
              name: 'ASPNETCORE_ENVIRONMENT'
              value: 'Production'
            }
            {
              name: 'ASPNETCORE_URLS'
              value: 'http://+:8080'
            }
            {
              name: 'DATABASE__PROVIDER'
              value: 'Sqlite'
            }
            {
              name: 'DATABASE__CONNECTIONSTRING'
              value: 'Data Source=/app/data/retailfixit.db'
            }
          ]
          volumeMounts: [
            {
              mountPath: '/app/data'
              volumeName: 'data'
            }
          ]
        }
      ]
      volumes: [
        {
          name: 'data'
          storageType: 'EmptyDir'
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 2
        rules: [
          {
            name: 'http-rule'
            http: {
              metadata: {
                concurrentRequests: '10'
              }
            }
          }
        ]
      }
    }
  }
}

// Outputs
output acrName string = acr.name
output acrLoginServer string = acr.properties.loginServer
output acrAdminUsername string = acr.name
output acrAdminPassword string = acr.listCredentials().passwords[0].value
output apiUrl string = 'https://${apiContainerApp.properties.configuration.ingress.fqdn}'
output containerAppName string = apiContainerApp.name
