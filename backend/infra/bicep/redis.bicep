param location string
param environment string

var redisName = 'redis-retailfixit-${environment}-${uniqueString(resourceGroup().id)}'

resource redisCache 'Microsoft.Cache/Redis@2023-08-01' = {
  name: redisName
  location: location
  tags: {
    Environment: environment
  }
  properties: {
    sku: {
      name: environment == 'prod' ? 'Standard' : 'Basic'
      family: 'C'
      capacity: environment == 'prod' ? 1 : 0
    }
    enableNonSslPort: false
    redisVersion: '6'
    publicNetworkAccess: 'Enabled'
    minimumTlsVersion: '1.2'
  }
}

var connectionString = '${redisCache.properties.hostName}:6380,password=${redisCache.listKeys().primaryKey},ssl=True,abortConnect=False'

output name string = redisCache.name
output hostName string = redisCache.properties.hostName
output key string = redisCache.listKeys().primaryKey
output connectionString string = connectionString
