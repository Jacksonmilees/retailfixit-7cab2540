# RetailFixIt Azure Deployment Script
# Run this in PowerShell as Administrator

param(
    [string]$ResourceGroup = "rg-retailfixit-dev",
    [string]$Location = "eastus",
    [string]$Environment = "dev",
    [string]$SqlPassword = "RetailFixIt2024!",
    [switch]$SkipInfrastructure = $false
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "`n=== $Message ===" -ForegroundColor Cyan
}

function Test-Command {
    param([string]$Command)
    $exists = Get-Command $Command -ErrorAction SilentlyContinue
    return $exists -ne $null
}

# Step 1: Check and Install Azure CLI
Write-Step "Checking Azure CLI"

if (Test-Command "az") {
    Write-Host "Azure CLI is already installed" -ForegroundColor Green
    az --version | Select-String "azure-cli"
} else {
    Write-Host "Azure CLI not found. Installing..." -ForegroundColor Yellow
    
    # Download and install Azure CLI
    $installerUrl = "https://aka.ms/installazurecliwindows"
    $installerPath = "$env:TEMP\AzureCLI.msi"
    
    Write-Host "Downloading Azure CLI installer..."
    Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath
    
    Write-Host "Installing Azure CLI (this may take a few minutes)..."
    Start-Process msiexec.exe -Wait -ArgumentList "/I $installerPath /quiet /norestart"
    
    # Refresh environment variables
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    
    # Verify installation
    if (Test-Command "az") {
        Write-Host "Azure CLI installed successfully!" -ForegroundColor Green
    } else {
        throw "Azure CLI installation failed. Please install manually from https://aka.ms/installazurecliwindows"
    }
}

# Step 2: Login to Azure
Write-Step "Azure Login"

$account = az account show 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Please login to Azure..." -ForegroundColor Yellow
    az login
} else {
    Write-Host "Already logged in to Azure" -ForegroundColor Green
    az account show --query "name" -o tsv
}

# Step 3: Check Docker
Write-Step "Checking Docker"

if (Test-Command "docker") {
    Write-Host "Docker is installed" -ForegroundColor Green
    docker --version
} else {
    Write-Host "Docker not found. Please install Docker Desktop from https://www.docker.com/products/docker-desktop" -ForegroundColor Red
    throw "Docker is required for deployment"
}

# Step 4: Create Resource Group
Write-Step "Creating Resource Group"

$rgExists = az group exists --name $ResourceGroup
if ($rgExists -eq "false") {
    Write-Host "Creating resource group: $ResourceGroup in $Location"
    az group create --name $ResourceGroup --location $Location
    Write-Host "Resource group created!" -ForegroundColor Green
} else {
    Write-Host "Resource group already exists: $ResourceGroup" -ForegroundColor Yellow
}

# Step 5: Deploy Infrastructure (Bicep)
if (-not $SkipInfrastructure) {
    Write-Step "Deploying Infrastructure (SQL, Cosmos, Redis, Service Bus, SignalR)"
    
    $bicepPath = "backend/infra/bicep/main.bicep"
    if (-not (Test-Path $bicepPath)) {
        throw "Bicep template not found at: $bicepPath"
    }
    
    Write-Host "This will deploy:"
    Write-Host "  - Azure SQL Server (with RLS)"
    Write-Host "  - Cosmos DB (Audit logs)"
    Write-Host "  - Redis Cache"
    Write-Host "  - Service Bus"
    Write-Host "  - SignalR Service"
    Write-Host "  - Container Apps Environment"
    Write-Host "  - Key Vault (for secrets)"
    Write-Host ""
    
    $deploymentName = "deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    
    az deployment group create `
        --resource-group $ResourceGroup `
        --template-file $bicepPath `
        --name $deploymentName `
        --parameters environment=$Environment `
        --parameters sqlAdminPassword=$SqlPassword `
        --parameters location=$Location
    
    if ($LASTEXITCODE -ne 0) {
        throw "Infrastructure deployment failed"
    }
    
    Write-Host "Infrastructure deployed successfully!" -ForegroundColor Green
} else {
    Write-Host "Skipping infrastructure deployment (using --SkipInfrastructure)" -ForegroundColor Yellow
}

# Step 6: Get Deployment Outputs
Write-Step "Getting Deployment Outputs"

$acrName = az deployment group show `
    --resource-group $ResourceGroup `
    --name "$(az deployment group list --resource-group $ResourceGroup --query '[?contains(name, \'deploy-\')] | [0].name' -o tsv)" `
    --query "properties.outputs.acrName.value" -o tsv 2>$null

if (-not $acrName) {
    $acrName = "retailfixitacr"
}

$containerAppEnv = az deployment group show `
    --resource-group $ResourceGroup `
    --name "$(az deployment group list --resource-group $ResourceGroup --query '[?contains(name, \'deploy-\')] | [0].name' -o tsv)" `
    --query "properties.outputs.containerAppEnvName.value" -o tsv 2>$null

if (-not $containerAppEnv) {
    $containerAppEnv = "cae-retailfixit-dev"
}

Write-Host "ACR Name: $acrName" -ForegroundColor Gray
Write-Host "Container App Env: $containerAppEnv" -ForegroundColor Gray

# Step 7: Build and Push Docker Image
Write-Step "Building and Pushing Docker Image"

$apiPath = "backend/src/RetailFixIt.Api"
if (-not (Test-Path "$apiPath/Dockerfile")) {
    # Create Dockerfile if not exists
    $dockerfileContent = @"
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["RetailFixIt.Api.csproj", "RetailFixIt.Api/"]
RUN dotnet restore "RetailFixIt.Api/RetailFixIt.Api.csproj"
COPY . .
WORKDIR "/src/RetailFixIt.Api"
RUN dotnet build "RetailFixIt.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "RetailFixIt.Api.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "RetailFixIt.Api.dll"]
"@
    Set-Content -Path "$apiPath/Dockerfile" -Value $dockerfileContent
    Write-Host "Created Dockerfile" -ForegroundColor Green
}

Write-Host "Building Docker image..."
cd $apiPath
docker build -t retailfixit-api:latest .

Write-Host "Logging into Azure Container Registry..."
az acr login --name $acrName

Write-Host "Tagging image..."
docker tag retailfixit-api:latest "$acrName.azurecr.io/retailfixit-api:v1"

Write-Host "Pushing image to ACR..."
docker push "$acrName.azurecr.io/retailfixit-api:v1"

cd ../..

# Step 8: Deploy Container App
Write-Step "Deploying Container App"

$containerAppName = "api-retailfixit-$Environment"

# Check if container app exists
$appExists = az containerapp show --name $containerAppName --resource-group $ResourceGroup 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Creating new Container App..."
    
    az containerapp create `
        --name $containerAppName `
        --resource-group $ResourceGroup `
        --environment $containerAppEnv `
        --image "$acrName.azurecr.io/retailfixit-api:v1" `
        --target-port 8080 `
        --ingress external `
        --registry-server "$acrName.azurecr.io" `
        --cpu 0.5 `
        --memory 1Gi `
        --min-replicas 1 `
        --max-replicas 3
} else {
    Write-Host "Updating existing Container App..."
    
    az containerapp update `
        --name $containerAppName `
        --resource-group $ResourceGroup `
        --image "$acrName.azurecr.io/retailfixit-api:v1"
}

# Step 9: Get Public URL and Configure Secrets
Write-Step "Configuring App and Getting URL"

# Get the public URL
$apiUrl = az containerapp show `
    --name $containerAppName `
    --resource-group $ResourceGroup `
    --query "properties.configuration.ingress.fqdn" `
    --output tsv

$fullApiUrl = "https://$apiUrl"

Write-Host ""
Write-Host "===============================================" -ForegroundColor Green
Write-Host "  DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""
Write-Host "API URL: $fullApiUrl" -ForegroundColor Yellow
Write-Host "Health Check: $fullApiUrl/healthz" -ForegroundColor Yellow
Write-Host "API Docs: $fullApiUrl/swagger" -ForegroundColor Yellow
Write-Host ""
Write-Host "To connect your frontend, update:" -ForegroundColor Cyan
Write-Host "  src/lib/api/client.ts" -ForegroundColor White
Write-Host ""
Write-Host "Change line 59 from:"
Write-Host "  export const api: ApiClient = new MockApi();" -ForegroundColor Gray
Write-Host "To:"
Write-Host "  import { HttpApi } from './http-api';" -ForegroundColor Green
Write-Host "  export const api: ApiClient = new HttpApi({" -ForegroundColor Green
Write-Host "    baseUrl: '$fullApiUrl/v1'" -ForegroundColor Green
Write-Host "  });" -ForegroundColor Green
Write-Host ""
Write-Host "Connection Strings are stored in Key Vault" -ForegroundColor Gray
Write-Host "To view them:"
Write-Host "  az keyvault secret list --vault-name kv-retailfixit-dev" -ForegroundColor Gray
Write-Host ""

# Save deployment info to file
$deploymentInfo = @"
# RetailFixIt Deployment Info
Deployment Date: $(Get-Date)
Resource Group: $ResourceGroup
Location: $Location
Environment: $Environment
API URL: $fullApiUrl
Container App: $containerAppName
ACR: $acrName.azurecr.io

# Frontend Configuration
Base URL: $fullApiUrl/v1
SignalR Hub: $fullApiUrl/hubs/ops

# Test Commands:
curl $fullApiUrl/healthz
curl $fullApiUrl/readyz
"@

$deploymentInfo | Out-File -FilePath "DEPLOYMENT_INFO.txt" -Encoding UTF8
Write-Host "Deployment info saved to: DEPLOYMENT_INFO.txt" -ForegroundColor Gray

# Step 10: Test the deployment
Write-Step "Testing Deployment"

Write-Host "Testing health endpoint..."
try {
    $response = Invoke-WebRequest -Uri "$fullApiUrl/healthz" -UseBasicParsing -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        Write-Host "Health check PASSED!" -ForegroundColor Green
    }
} catch {
    Write-Host "Health check failed (app may still be starting): $_" -ForegroundColor Yellow
    Write-Host "Try again in 2-3 minutes with: curl $fullApiUrl/healthz" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Update frontend: src/lib/api/client.ts" -ForegroundColor White
Write-Host "2. Deploy frontend to Vercel/Netlify" -ForegroundColor White
Write-Host "3. Configure CORS in backend if needed" -ForegroundColor White
Write-Host "4. Set up CI/CD with GitHub Actions" -ForegroundColor White
