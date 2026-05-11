param location string
param environment string

var namespaceName = 'sb-retailfixit-${environment}-${uniqueString(resourceGroup().id)}'

resource serviceBusNamespace 'Microsoft.ServiceBus/namespaces@2022-10-01-preview' = {
  name: namespaceName
  location: location
  tags: {
    Environment: environment
  }
  sku: {
    name: environment == 'prod' ? 'Standard' : 'Basic'
    tier: environment == 'prod' ? 'Standard' : 'Basic'
  }
  properties: {
    publicNetworkAccess: 'Enabled'
    disableLocalAuth: false
  }

  // Topics
  resource eventsTopic 'topics' = {
    name: 'events'
    properties: {
      defaultMessageTimeToLive: 'P14D'
      maxSizeInMegabytes: 1024
      requiresDuplicateDetection: false
      enablePartitioning: false
      supportOrdering: false
      autoDeleteOnIdle: 'P14D'
      enableBatchedOperations: true
    }

    // Subscriptions
    resource allSub 'subscriptions' = {
      name: 'all-events'
      properties: {
        isClientAffine: false
        lockDuration: 'PT1M'
        requiresSession: false
        defaultMessageTimeToLive: 'P14D'
        deadLetteringOnMessageExpiration: true
        maxDeliveryCount: 10
        enableBatchedOperations: true
      }
    }
  }

  // Queue for AI recommendations
  resource aiQueue 'queues' = {
    name: 'ai-recommendations'
    properties: {
      lockDuration: 'PT5M'
      maxSizeInMegabytes: 1024
      requiresDuplicateDetection: false
      requiresSession: false
      defaultMessageTimeToLive: 'P1D'
      deadLetteringOnMessageExpiration: true
      maxDeliveryCount: 3
      enableBatchedOperations: true
    }
  }
}

var connectionString = serviceBusNamespace.listKeys().primaryConnectionString

output namespaceName string = serviceBusNamespace.name
output connectionString string = connectionString
output eventsTopicName string = 'events'
output aiQueueName string = 'ai-recommendations'
