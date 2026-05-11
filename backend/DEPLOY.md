# Deploy RetailFixIt Backend to Azure

## Option 1: Azure Container Apps (Fastest - 10 minutes)

### Prerequisites
```bash
# Install Azure CLI if not already installed
# https://docs.microsoft.com/en-us/cli/azure/install-azure-cli

# Login to Azure
az login

# Set your subscription
az account set --subscription "Your Subscription Name"
```

### Step 1: Build and Push Docker Image

```bash
# Navigate to backend API project
cd backend/src/RetailFixIt.Api

# Build Docker image
docker build -t retailfixit-api:latest .

# Create Azure Container Registry (one-time)
az acr create --resource-group rg-retailfixit-dev --name retailfixitacr --sku Basic --location eastus

# Login to ACR
az acr login --name retailfixitacr

# Tag image for ACR
docker tag retailfixit-api:latest retailfixitacr.azurecr.io/retailfixit-api:v1

# Push to ACR
docker push retailfixitacr.azurecr.io/retailfixit-api:v1
```

### Step 2: Deploy Infrastructure (Bicep)

```bash
# Navigate to infra folder
cd backend/infra/bicep

# Create resource group
az group create --name rg-retailfixit-dev --location eastus

# Deploy main.bicep (creates SQL, Cosmos, Redis, Service Bus, SignalR, Container Apps)
az deployment group create \
  --resource-group rg-retailfixit-dev \
  --template-file main.bicep \
  --parameters environment=dev \
  --parameters sqlAdminLogin=sqladmin \
  --parameters sqlAdminPassword='YourStrongPassword123!'
```

### Step 3: Get Connection Strings

```bash
# Get outputs from deployment
az deployment group show \
  --resource-group rg-retailfixit-dev \
  --name main \
  --query properties.outputs

# Key Vault will contain all secrets automatically
```

### Step 4: Deploy Container App

```bash
# Create Container App Environment (if not created by Bicep)
az containerapp env create \
  --name cae-retailfixit-dev \
  --resource-group rg-retailfixit-dev \
  --location eastus

# Deploy the API container
az containerapp create \
  --name api-retailfixit-dev \
  --resource-group rg-retailfixit-dev \
  --environment cae-retailfixit-dev \
  --image retailfixitacr.azurecr.io/retailfixit-api:v1 \
  --target-port 8080 \
  --ingress external \
  --query-configuration \
  --env-vars \
    "ASPNETCORE_ENVIRONMENT=Production" \
    "ConnectionStrings__SqlServer=@Microsoft.KeyVault(SecretName=sql-connection-string)" \
    "ConnectionStrings__Redis=@Microsoft.KeyVault(SecretName=redis-connection)" \
    "Cosmos__Endpoint=@Microsoft.KeyVault(SecretName=cosmos-endpoint)" \
    "Cosmos__Key=@Microsoft.KeyVault(SecretName=cosmos-key)" \
    "ServiceBus__ConnectionString=@Microsoft.KeyVault(SecretName=servicebus-connection)"
```

### Step 5: Get Public URL

```bash
# Get the public URL
az containerapp show \
  --name api-retailfixit-dev \
  --resource-group rg-retailfixit-dev \
  --query properties.configuration.ingress.fqdn \
  -o tsv

# Will output something like: api-retailfixit-dev.eastus.azurecontainerapps.io
```

---

## Option 2: Azure App Service (Traditional - 15 mins)

```bash
# Create App Service Plan
az appservice plan create \
  --name asp-retailfixit-dev \
  --resource-group rg-retailfixit-dev \
  --sku B1 \
  --is-linux \
  --location eastus

# Create Web App
az webapp create \
  --name api-retailfixit-dev \
  --resource-group rg-retailfixit-dev \
  --plan asp-retailfixit-dev \
  --runtime "DOTNETCORE:8.0"

# Deploy via ZIP (if not using containers)
az webapp deployment source config-zip \
  --resource-group rg-retailfixit-dev \
  --name api-retailfixit-dev \
  --src api-publish.zip
```

---

## Option 3: GitHub Actions CI/CD (Recommended for Production)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Azure

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0.x'
      
      - name: Build
        run: dotnet build backend/RetailFixIt.sln --configuration Release
      
      - name: Publish
        run: dotnet publish backend/src/RetailFixIt.Api -c Release -o ./publish
      
      - name: Docker Build & Push
        uses: azure/docker-login@v1
        with:
          login-server: retailfixitacr.azurecr.io
          username: ${{ secrets.ACR_USERNAME }}
          password: ${{ secrets.ACR_PASSWORD }}
      
      - run: |
          docker build -t retailfixitacr.azurecr.io/api:${{ github.sha }} .
          docker push retailfixitacr.azurecr.io/api:${{ github.sha }}
      
      - name: Deploy to Container Apps
        uses: azure/container-apps-deploy-action@v1
        with:
          acrName: retailfixitacr
          containerAppName: api-retailfixit-dev
          resourceGroup: rg-retailfixit-dev
          imageToDeploy: retailfixitacr.azurecr.io/api:${{ github.sha }}
```

---

## Connect Frontend to Backend

### Step 1: Update Frontend API Client

Edit `src/lib/api/client.ts`:

```typescript
import { HttpApi } from "./http-api";

// Replace this line:
// export const api: ApiClient = new MockApi();

// With this:
export const api: ApiClient = new HttpApi({
  baseUrl: "https://api-retailfixit-dev.eastus.azurecontainerapps.io/v1"
});
```

### Step 2: Configure CORS (Backend)

The backend already has CORS configured in `Program.cs` for the frontend URL.

Update `appsettings.Production.json`:

```json
{
  "Cors": {
    "AllowedOrigins": [
      "https://retailfixit.vercel.app",
      "https://retailfixit.io",
      "http://localhost:5173"
    ]
  }
}
```

### Step 3: Deploy Frontend

```bash
# Build for production
npm run build

# Deploy to Vercel (recommended)
npm i -g vercel
vercel --prod

# Or deploy to Azure Static Web Apps
```

---

## Quick Start: One-Command Deploy

I've created a PowerShell script for Windows:

```powershell
# deploy-azure.ps1
param(
    [string]$ResourceGroup = "rg-retailfixit-dev",
    [string]$Location = "eastus",
    [string]$Environment = "dev"
)

# Login
az login

# Create resource group
az group create --name $ResourceGroup --location $Location

# Deploy infrastructure
az deployment group create `
  --resource-group $ResourceGroup `
  --template-file backend/infra/bicep/main.bicep `
  --parameters environment=$Environment

# Build and push container
docker build -t retailfixit-api backend/src/RetailFixIt.Api
docker tag retailfixit-api retailfixitacr.azurecr.io/retailfixit-api:latest
az acr login --name retailfixitacr
docker push retailfixitacr.azurecr.io/retailfixit-api:latest

# Deploy container app
az containerapp update `
  --name api-retailfixit-dev `
  --resource-group $ResourceGroup `
  --image retailfixitacr.azurecr.io/retailfixit-api:latest

# Get URL
$URL = az containerapp show --name api-retailfixit-dev --resource-group $ResourceGroup --query properties.configuration.ingress.fqdn -o tsv
Write-Host "API deployed to: https://$URL"
Write-Host "Update frontend baseUrl to: https://$URL/v1"
```

Run it:
```powershell
.\deploy-azure.ps1
```

---

## Connection String Setup

After deployment, set these in Azure Key Vault (already configured by Bicep):

| Secret Name | Value Source |
|-------------|--------------|
| `sql-connection-string` | Azure SQL → Connection strings |
| `cosmos-endpoint` | Cosmos DB → Keys → URI |
| `cosmos-key` | Cosmos DB → Keys → Primary Key |
| `redis-connection` | Redis → Access keys |
| `servicebus-connection` | Service Bus → Shared access policies |
| `signalr-connection` | SignalR → Keys |

---

## Verify Deployment

```bash
# Test health endpoint
curl https://api-retailfixit-dev.eastus.azurecontainerapps.io/healthz

# Should return: Healthy

# Test API
curl https://api-retailfixit-dev.eastus.azurecontainerapps.io/v1/dashboard/metrics \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Architecture After Deployment

```
┌─────────────────┐     ┌─────────────────────────────────────────┐
│   Frontend      │────▶│  Azure Container Apps (API)               │
│   (Vercel)      │     │  - .NET 8 API                            │
└─────────────────┘     │  - SignalR Hub (/hubs/ops)               │
                        └──────────────┬──────────────────────────┘
                                       │
          ┌────────────────────────────┼────────────────────────────┐
          │                            │                            │
          ▼                            ▼                            ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐
│  Azure SQL       │  │  Cosmos DB       │  │  Redis Cache     │  │  Service Bus │
│  (RLS enabled)   │  │  (Audit logs)    │  │  (Idempotency)   │  │  (Events)    │
└──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────┘
```

---

## Cost Estimate (Dev Environment)

| Service | Tier | Monthly Cost |
|---------|------|--------------|
| Container Apps | Consumption | ~$5-15 |
| Azure SQL | Basic (5 DTU) | ~$5 |
| Cosmos DB | Serverless | ~$2-5 |
| Redis | Basic C0 | ~$17 |
| Service Bus | Basic | ~$0.05/million ops |
| SignalR | Free (20 conn) | $0 |
| **Total** | | **~$30-50/month** |

---

## Next Steps

1. **Deploy now**: Use Option 1 (Container Apps) for fastest setup
2. **Configure domain**: Add custom domain to Container Apps
3. **Enable HTTPS**: Already enabled by default
4. **Set up monitoring**: Application Insights is configured
5. **CI/CD**: Set up GitHub Actions for automatic deployments

## Need Help?

Common issues:
- **SQL firewall**: Add Azure services to SQL firewall rules (done in Bicep)
- **CORS errors**: Update AllowedOrigins in backend appsettings
- **Key Vault access**: Container App needs managed identity access to Key Vault
- **SignalR CORS**: Configure SignalR service CORS settings

Run the Bicep deployment first - it sets up everything including networking, firewalls, and Key Vault access.
