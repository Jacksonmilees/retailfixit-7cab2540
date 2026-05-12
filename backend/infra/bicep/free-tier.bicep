targetScope = 'subscription'

param location string = 'eastus'
param environment string = 'dev'

// Resource Group
resource rg 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: 'rg-retailfixit-${environment}'
  location: location
}

// App Service Plan - Free Tier (F1)
module appServicePlan 'br/public:avm/res/web/serverfarm:0.2.1' = {
  name: 'appserviceplan-module'
  scope: rg
  params: {
    name: 'plan-retailfixit-${environment}'
    location: location
    skuName: 'F1'
    skuTier: 'Free'
    kind: 'linux'
    reserved: true
  }
}

// Storage Account for SQLite database and file uploads
module storage 'br/public:avm/res/storage/storage-account:0.9.1' = {
  name: 'storage-module'
  scope: rg
  params: {
    name: 'stretail${uniqueString(rg.id)}'
    location: location
    skuName: 'Standard_LRS'
    kind: 'StorageV2'
    allowBlobPublicAccess: false
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
    blobServices: {
      containers: [
        {
          name: 'data'
          publicAccess: 'None'
        }
        {
          name: 'uploads'
          publicAccess: 'None'
        }
      ]
    }
    fileServices: {
      shares: [
        {
          name: 'appdata'
          shareQuota: 10
        }
      ]
    }
  }
}

// Web App - API
module webApp 'br/public:avm/res/web/site:0.6.0' = {
  name: 'webapp-module'
  scope: rg
  params: {
    name: 'api-retailfixit-${environment}'
    location: location
    kind: 'app,linux'
    serverFarmResourceId: appServicePlan.outputs.resourceId
    siteConfig: {
      alwaysOn: false // Required for Free tier
      http20Enabled: true
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      scmMinTlsVersion: '1.2'
      healthCheckPath: '/healthz'
      appSettings: [
        {
          name: 'ASPNETCORE_ENVIRONMENT'
          value: 'Production'
        }
        {
          name: 'DATABASE__PROVIDER'
          value: 'Sqlite'
        }
        {
          name: 'DATABASE__CONNECTIONSTRING'
          value: 'Data Source=/home/site/wwwroot/data/retailfixit.db'
        }
        {
          name: 'USE_INMEMORY_CACHE'
          value: 'true'
        }
        {
          name: 'DISABLE_SIGNALR'
          value: 'true'
        }
        {
          name: 'AZURE_STORAGE_CONNECTIONSTRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storage.outputs.name};AccountKey=${storage.outputs.primaryAccessKey};EndpointSuffix=core.windows.net'
        }
        {
          name: 'AZURE_STORAGE_CONTAINER'
          value: 'uploads'
        }
      ]
    }
  }
}

// Outputs
output webAppName string = webApp.outputs.name
output webAppUrl string = 'https://${webApp.outputs.defaultHostname}'
output storageName string = storage.outputs.name
