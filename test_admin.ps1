# StitchSmart Admin Seeding & Authorization Automated Verification Script
$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " STITCHSMART - ADMIN SEEDING & ROLE VERIFICATION TEST" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:5000"
$adminEmail = "admin@stitchsmart.com"
$adminPassword = "Admin@123456"

# Test 1: Wrong password rejected
Write-Host "`n[Test 1] Attempt admin login with invalid password..." -ForegroundColor Yellow
try {
    $badLogin = @{ email = $adminEmail; password = "WrongPassword123" } | ConvertTo-Json
    Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method Post -Body $badLogin -ContentType "application/json" -UseBasicParsing
    Write-Host "FAIL: Bad password should not have succeeded!" -ForegroundColor Red
    exit 1
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 401) {
        Write-Host "PASS: Rejected with 401 Unauthorized as expected." -ForegroundColor Green
    } else {
        Write-Host "FAIL: Unexpected status code: $status" -ForegroundColor Red
        exit 1
    }
}

# Test 2: Valid admin login
Write-Host "`n[Test 2] Attempt admin login with valid credentials..." -ForegroundColor Yellow
$loginBody = @{ email = $adminEmail; password = $adminPassword } | ConvertTo-Json
$loginRes = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"

if ($loginRes.success -and $loginRes.user.role -eq "admin") {
    Write-Host "PASS: Admin logged in successfully! Role: $($loginRes.user.role)" -ForegroundColor Green
    Write-Host "      User Name: $($loginRes.user.name)" -ForegroundColor Gray
    Write-Host "      Email:     $($loginRes.user.email)" -ForegroundColor Gray
} else {
    Write-Host "FAIL: Admin login did not return role 'admin'." -ForegroundColor Red
    exit 1
}

$adminToken = $loginRes.token
$adminHeaders = @{ Authorization = "Bearer $adminToken" }

# Test 3: Admin access to GET /api/auth/me
Write-Host "`n[Test 3] Verify GET /api/auth/me with admin token..." -ForegroundColor Yellow
$meRes = Invoke-RestMethod -Uri "$baseUrl/api/auth/me" -Method Get -Headers $adminHeaders
if ($meRes.success -and $meRes.user.role -eq "admin") {
    Write-Host "PASS: /api/auth/me confirmed role 'admin'." -ForegroundColor Green
} else {
    Write-Host "FAIL: /api/auth/me failed." -ForegroundColor Red
    exit 1
}

# Test 4: Admin access to GET /api/auth/admin-check
Write-Host "`n[Test 4] Verify GET /api/auth/admin-check..." -ForegroundColor Yellow
$checkRes = Invoke-RestMethod -Uri "$baseUrl/api/auth/admin-check" -Method Get -Headers $adminHeaders
if ($checkRes.success) {
    Write-Host "PASS: $($checkRes.message)" -ForegroundColor Green
} else {
    Write-Host "FAIL: admin-check failed." -ForegroundColor Red
    exit 1
}

# Test 5: Admin access to GET /api/orders (admin dashboard orders)
Write-Host "`n[Test 5] Verify Admin access to GET /api/orders..." -ForegroundColor Yellow
$ordersRes = Invoke-RestMethod -Uri "$baseUrl/api/orders" -Method Get -Headers $adminHeaders
if ($ordersRes.success) {
    Write-Host "PASS: Successfully fetched orders list. Total orders: $($ordersRes.count)" -ForegroundColor Green
    foreach ($ord in $ordersRes.data) {
        Write-Host "      Order: $($ord.orderNumber) | $($ord.clothingType) | $($ord.status) | INR $($ord.price)" -ForegroundColor Gray
    }
} else {
    Write-Host "FAIL: GET /api/orders failed for admin." -ForegroundColor Red
    exit 1
}

# Test 6: Verify a customer CANNOT access admin endpoints
Write-Host "`n[Test 6] Register a regular customer and verify 403 Forbidden on admin routes..." -ForegroundColor Yellow
$rand = Get-Random -Minimum 100000 -Maximum 999999
$custEmail = "customer_test_$rand@stitchsmart.com"
$regBody = @{
    name = "Regular Customer"
    email = $custEmail
    phone = "9876543210"
    password = "Customer@123"
} | ConvertTo-Json

$custLoginRes = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method Post -Body $regBody -ContentType "application/json"
$custToken = $custLoginRes.token
$custHeaders = @{ Authorization = "Bearer $custToken" }

try {
    Invoke-WebRequest -Uri "$baseUrl/api/orders" -Method Get -Headers $custHeaders -UseBasicParsing
    Write-Host "FAIL: Customer was able to access admin GET /api/orders!" -ForegroundColor Red
    exit 1
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 403) {
        Write-Host "PASS: Customer correctly blocked with 403 Forbidden from GET /api/orders." -ForegroundColor Green
    } else {
        Write-Host "FAIL: Expected 403, got $status" -ForegroundColor Red
        exit 1
    }
}

try {
    Invoke-WebRequest -Uri "$baseUrl/api/auth/admin-check" -Method Get -Headers $custHeaders -UseBasicParsing
    Write-Host "FAIL: Customer was able to access GET /api/auth/admin-check!" -ForegroundColor Red
    exit 1
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 403) {
        Write-Host "PASS: Customer correctly blocked with 403 Forbidden from GET /api/auth/admin-check." -ForegroundColor Green
    } else {
        Write-Host "FAIL: Expected 403, got $status" -ForegroundColor Red
        exit 1
    }
}

# Test 7: Verify public registration cannot tamper with role
Write-Host "`n[Test 7] Verify public registration ignores 'role: admin' injection..." -ForegroundColor Yellow
$hackerEmail = "hacker_$rand@stitchsmart.com"
$hackerBody = @{
    name = "Sneaky Admin Attempt"
    email = $hackerEmail
    password = "HackerPassword123"
    role = "admin"
} | ConvertTo-Json

$hackerRes = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method Post -Body $hackerBody -ContentType "application/json"
if ($hackerRes.user.role -eq "customer") {
    Write-Host "PASS: Security enforced! Server forced role: 'customer' (ignored injected 'admin')." -ForegroundColor Green
} else {
    Write-Host "FAIL: Public registration allowed role escalation to $($hackerRes.user.role)!" -ForegroundColor Red
    exit 1
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " ALL 7 ADMIN SEEDING & AUTHORIZATION TESTS PASSED!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
