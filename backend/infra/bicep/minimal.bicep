targetScope = 'subscription'

param location string = 'eastus'
param environment string = 'dev'

// Resource Group
resource rg 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: 'rg-retailfixit-${environment}'
  location: location
  tags: {
    Environment: environment
    ManagedBy: 'Bicep'
    Project: 'RetailFixIt'
  }
}

// Container Registry
module acr 'br/public:avm/res/container-registry/registry:0.1.1' = {
  name: 'acr-module'
  scope: rg
  params: {
    name: 'retailfixitacr${uniqueString(rg.id)}'
    location: location
    tags: {
      Environment: environment
    }
    acrSku: 'Basic'
    acrAdminUserEnabled: true
  }
}

// Log Analytics Workspace
module logAnalytics 'br/public:avm/res/operational-insights/workspace:0.3.2' = {
  name: 'loganalytics-module'
  scope: rg
  params: {
    name: 'log-retailfixit-${environment}-${uniqueString(rg.id)}'
    location: location
  }
}

// Container Apps Environment
module containerAppEnv 'br/public:avm/res/app/managed-environment:0.4.2' = {
  name: 'containerappenv-module'
  scope: rg
  params: {
    name: 'cae-retailfixit-${environment}'
    location: location
    logAnalyticsWorkspaceResourceId: logAnalytics.outputs.resourceId
  }
}

// Container App - API
module apiContainerApp 'br/public:avm/res/app/container-app:0.7.0' = {
  name: 'api-containerapp-module'
  scope: rg
  params: {
    name: 'api-retailfixit-${environment}'
    environmentResourceId: containerAppEnv.outputs.resourceId
    location: location
    tags: {
      Environment: environment
      App: 'api'
    }
    ingressExternal: true
    ingressTargetPort: 8080
    ingressTransport: 'auto'
    corsPolicy: {
      allowedOrigins: [
        '*'
      ]
    }
    secrets: {
      secureList: [
        {
          name: 'registry-password'
          value: acr.outputs.loginServer // Will be replaced with actual credentials
        }
      ]
    }
    registries: [
      {
        server: acr.outputs.loginServer
        username: acr.outputs.name
        passwordSecretRef: 'registry-password'
      }
    ]
    containers: [
      {
        image: '${acr.outputs.loginServer}/retailfixit-api:latest'
        name: 'api'
        resources: {
          cpu: '0.25'
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
    scaleMinReplicas: 0
    scaleMaxReplicas: 3
  }
}

// Outputs
output acrName string = acr.outputs.name
output acrLoginServer string = acr.outputs.loginServer
output containerAppEnvName string = containerAppEnv.outputs.name
output apiUrl string = 'https://${apiContainerApp.outputs.fqdn}'
