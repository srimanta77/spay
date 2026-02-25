# setup.ps1
Write-Host "Creating SPay project structure..." -ForegroundColor Cyan

# Root directories
$dirs = @(
    "frontend",
    "backend",
    "database/migrations",
    "database/seeds",
    "infrastructure/docker",
    "infrastructure/kubernetes",
    "infrastructure/terraform",
    "infrastructure/monitoring/prometheus",
    "infrastructure/monitoring/grafana",
    "docs/architecture",
    "docs/api",
    "docs/security",
    "docs/user-guides",
    "scripts"
)

foreach ($dir in $dirs) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
}

# Root files
@(
    ".env.example",
    ".gitignore",
    "docker-compose.yml",
    "LICENSE"
) | ForEach-Object { New-Item -ItemType File -Path $_ -Force | Out-Null }

# Frontend structure
$frontendDirs = @(
    "frontend/public",
    "frontend/src/app/(auth)",
    "frontend/src/app/(dashboard)",
    "frontend/src/app/(admin)",
    "frontend/src/components/ui",
    "frontend/src/components/forms",
    "frontend/src/components/payments",
    "frontend/src/components/security",
    "frontend/src/lib/api",
    "frontend/src/lib/auth",
    "frontend/src/lib/security",
    "frontend/src/lib/validation",
    "frontend/src/hooks",
    "frontend/src/store/slices",
    "frontend/src/types",
    "frontend/src/styles",
    "frontend/src/config",
    "frontend/tests/unit",
    "frontend/tests/integration",
    "frontend/tests/e2e"
)
foreach ($dir in $frontendDirs) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }

@(
    "frontend/.env.example",
    "frontend/next.config.js",
    "frontend/tailwind.config.js",
    "frontend/package.json"
) | ForEach-Object { New-Item -ItemType File -Path $_ -Force | Out-Null }

# Backend structure
$backendDirs = @(
    "backend/src/modules/auth/controllers",
    "backend/src/modules/auth/services",
    "backend/src/modules/auth/strategies",
    "backend/src/modules/auth/guards",
    "backend/src/modules/auth/dto",
    "backend/src/modules/users/controllers",
    "backend/src/modules/users/services",
    "backend/src/modules/users/repositories",
    "backend/src/modules/users/entities",
    "backend/src/modules/payments/controllers",
    "backend/src/modules/payments/services",
    "backend/src/modules/payments/processors",
    "backend/src/modules/wallet/controllers",
    "backend/src/modules/wallet/services",
    "backend/src/modules/wallet/ledger",
    "backend/src/modules/notifications/services",
    "backend/src/modules/admin/controllers",
    "backend/src/common/guards",
    "backend/src/common/interceptors",
    "backend/src/common/middleware",
    "backend/src/config",
    "backend/src/database/migrations",
    "backend/src/database/seeders",
    "backend/src/security",
    "backend/src/jobs/processors",
    "backend/tests/unit",
    "backend/tests/integration",
    "backend/tests/e2e"
)
foreach ($dir in $backendDirs) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }

@(
    "backend/.env.example",
    "backend/nest-cli.json",
    "backend/tsconfig.json",
    "backend/package.json"
) | ForEach-Object { New-Item -ItemType File -Path $_ -Force | Out-Null }

# Infrastructure files
@(
    "infrastructure/docker/Dockerfile.frontend",
    "infrastructure/docker/Dockerfile.backend",
    "infrastructure/docker/docker-compose.yml"
) | ForEach-Object { New-Item -ItemType File -Path $_ -Force | Out-Null }

# Database
New-Item -ItemType File -Path "database/schema.sql" -Force | Out-Null

Write-Host "✅ Project structure created successfully!" -ForegroundColor Green