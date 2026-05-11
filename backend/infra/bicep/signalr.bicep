param location string
param environment string

var signalrName = 'sigr-retailfixit-${environment}-${uniqueString(resourceGroup().id)}'

resource signalR 'Microsoft.SignalRService/signalR@2023-08-01-preview' = {
  name: signalrName
  location: location
  tags: {
    Environment: environment
  }
  sku: {
    name: environment == 'prod' ? 'Standard_S1' : 'Free_F1'
    tier: environment == 'prod' ? 'Standard' : 'Free'
    capacity: environment == 'prod' ? 1 : 1
  }
  kind: 'SignalR'
  properties: {
    tls: {
      clientCertEnabled: false
    }
    features: [
      {
        flag: 'ServiceMode'
        value: 'Default'
      }
      {
        flag: 'EnableConnectivityLogs'
        value: 'True'
      }
    ]
    cors: {
      allowedOrigins: [
        '*'
      ]
    }
    networkACLs: {
      defaultAction: 'Deny'
      publicNetwork: {
        allow: [
          'ServerConnection'
          'ClientConnection'
          'RESTAPI'
        ]
      }
    }
    upstream: {
      templates: []
    }
  }
}

var connectionString = signalR.listKeys().primaryConnectionString

output name string = signalR.name
output endpoint string = signalR.properties.hostName
output connectionString string = connectionString
