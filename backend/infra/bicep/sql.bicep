param location string
param environment string
param adminLogin string
@secure()
param adminPassword string

var sqlServerName = 'sql-retailfixit-${environment}-${uniqueString(resourceGroup().id)}'
var databaseName = 'RetailFixIt'

// SQL Server
resource sqlServer 'Microsoft.Sql/servers@2023-05-01-preview' = {
  name: sqlServerName
  location: location
  tags: {
    Environment: environment
  }
  properties: {
    administratorLogin: adminLogin
    administratorLoginPassword: adminPassword
    version: '12.0'
    publicNetworkAccess: 'Enabled'
    restrictOutboundNetworkAccess: 'Disabled'
  }

  // Allow Azure services
  resource firewall 'firewallRules' = {
    name: 'AllowAllAzureServices'
    properties: {
      startIpAddress: '0.0.0.0'
      endIpAddress: '0.0.0.0'
    }
  }

  // Allow Azure IPs
  resource azureFirewall 'firewallRules' = {
    name: 'AllowAllAzureIPs'
    properties: {
      startIpAddress: '0.0.0.0'
      endIpAddress: '255.255.255.255'
    }
  }

  // Database
  resource database 'databases' = {
    name: databaseName
    location: location
    sku: {
      name: environment == 'prod' ? 'S2' : 'S0'
      tier: 'Standard'
    }
    properties: {
      collation: 'SQL_Latin1_General_CP1_CI_AS'
      maxSizeBytes: 268435456000 // 250 GB
      catalogCollation: 'SQL_Latin1_General_CP1_CI_AS'
      zoneRedundant: false
      readScale: 'Disabled'
      requestedBackupStorageRedundancy: 'Local'
      isLedgerOn: false
    }
  }

  // Advanced Threat Protection
  resource tdp 'advancedThreatProtectionSettings' = {
    name: 'Default'
    properties: {
      state: 'Enabled'
    }
  }
}

// Connection string output
var connectionString = 'Server=tcp:${sqlServer.properties.fullyQualifiedDomainName},1433;Initial Catalog=${databaseName};Persist Security Info=False;User ID=${adminLogin};Password=${adminPassword};MultipleActiveResultSets=True;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;'

output fqdn string = sqlServer.properties.fullyQualifiedDomainName
output connectionString string = connectionString
output databaseName string = databaseName
