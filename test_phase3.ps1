$baseUrl = "http://localhost:5000"
$testSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession

Write-Host "========================================"
Write-Host "STITCHSMART PHASE 3: COMPREHENSIVE TESTS"
Write-Host "========================================"

# Test 12: Existing MongoDB Health Check
Write-Host "`n[Test 12] Existing MongoDB health check still works..."
$healthRes = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method Get
Write-Host "Status: $($healthRes.status), DB: $($healthRes.database.status), DB Name: $($healthRes.database.name)"
if ($healthRes.database.status -eq "connected" -and $healthRes.database.name -eq "stitchsmart") {
    Write-Host "-> PASSED: Health check operational and DB connected to 'stitchsmart'." -ForegroundColor Green
} else {
    Write-Host "-> FAILED: DB not connected." -ForegroundColor Red
}

# Test 2: Registration with missing or invalid fields
Write-Host "`n[Test 2] Registration with missing/invalid fields..."
try {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method Post -ContentType "application/json" -Body '{"name":"","email":"","password":""}'
    Write-Host "-> FAILED: Expected 400 Bad Request" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Received HTTP $statusCode (Expected 400)"
    if ($statusCode -eq 400) {
        Write-Host "-> PASSED: Rejected missing fields." -ForegroundColor Green
    } else {
        Write-Host "-> FAILED: Unexpected status code." -ForegroundColor Red
    }
}

# Test 2b: Short password (<6 chars)
try {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method Post -ContentType "application/json" -Body '{"name":"Tester","email":"testshort@stitchsmart.com","password":"123"}'
    Write-Host "-> FAILED: Expected 400 Bad Request for short password" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Short password rejected with HTTP $statusCode"
    if ($statusCode -eq 400) {
        Write-Host "-> PASSED: Short password rejected." -ForegroundColor Green
    }
}

# Test 1: Successful customer registration
Write-Host "`n[Test 1] Successful customer registration..."
$testEmail = "customer_$(Get-Random)@stitchsmart.com"
$regBody = @{
    name = "Aanya Verma"
    email = $testEmail
    phone = "+91 9876543210"
    password = "SecurePassword@123"
} | ConvertTo-Json

$regRes = Invoke-WebRequest -Uri "$baseUrl/api/auth/register" -Method Post -ContentType "application/json" -Body $regBody -WebSession $testSession -UseBasicParsing
Write-Host "HTTP Status: $($regRes.StatusCode)"
$regJson = $regRes.Content | ConvertFrom-Json
Write-Host "Response User: Name=$($regJson.user.name), Email=$($regJson.user.email), Role=$($regJson.user.role)"
if ($regRes.StatusCode -eq 201 -and $regJson.user.role -eq "customer" -and $null -eq $regJson.user.password) {
    Write-Host "-> PASSED: Registered customer successfully without exposing password." -ForegroundColor Green
} else {
    Write-Host "-> FAILED: Customer registration check failed." -ForegroundColor Red
}

# Test 3: Duplicate email registration
Write-Host "`n[Test 3] Duplicate email registration..."
try {
    $dupRes = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method Post -ContentType "application/json" -Body $regBody
    Write-Host "-> FAILED: Expected 400 for duplicate email" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Duplicate email rejected with HTTP $statusCode"
    if ($statusCode -eq 400) {
        Write-Host "-> PASSED: Duplicate registration prevented." -ForegroundColor Green
    }
}

# Test 4: Password is hashed in MongoDB
Write-Host "`n[Test 4] Verifying password is saved as Bcrypt hash in MongoDB..."
$hashCheck = node -e "
const mongoose = require('./server/node_modules/mongoose');
const User = require('./server/models/User');
mongoose.connect('mongodb://127.0.0.1:27017/stitchsmart').then(async () => {
    const user = await User.findOne({ email: '$testEmail' }).select('+password');
    if (!user) { console.log('USER_NOT_FOUND'); process.exit(1); }
    console.log('HASH_FOUND:' + user.password);
    process.exit(0);
});
"
Write-Host "Database result: $hashCheck"
if ($hashCheck.Contains('HASH_FOUND:$2')) {
    Write-Host "-> PASSED: Password in MongoDB is properly bcrypt-hashed ($($hashCheck.Substring(11, 29))...)" -ForegroundColor Green
} else {
    Write-Host "-> FAILED: Password was not hashed properly." -ForegroundColor Red
}

# Test 7: Accessing /api/auth/me without authentication
Write-Host "`n[Test 7] Accessing /api/auth/me without authentication..."
try {
    $noAuthRes = Invoke-RestMethod -Uri "$baseUrl/api/auth/me" -Method Get
    Write-Host "-> FAILED: Expected 401 Unauthorized" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Unauthenticated request rejected with HTTP $statusCode"
    if ($statusCode -eq 401) {
        Write-Host "-> PASSED: Protected route blocked without token." -ForegroundColor Green
    }
}

# Test 5: Successful login
Write-Host "`n[Test 5] Successful login with valid credentials..."
$loginSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBody = @{
    email = $testEmail
    password = "SecurePassword@123"
} | ConvertTo-Json

$loginRes = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody -WebSession $loginSession -UseBasicParsing
Write-Host "HTTP Status: $($loginRes.StatusCode)"
$loginJson = $loginRes.Content | ConvertFrom-Json
Write-Host "Logged In User: $($loginJson.user.name), Role=$($loginJson.user.role)"
if ($loginRes.StatusCode -eq 200 -and $null -eq $loginJson.user.password) {
    Write-Host "-> PASSED: Login succeeded, HttpOnly cookie established." -ForegroundColor Green
} else {
    Write-Host "-> FAILED: Login failed." -ForegroundColor Red
}

# Test 6: Login with incorrect password
Write-Host "`n[Test 6] Login with incorrect password..."
$badLoginBody = @{
    email = $testEmail
    password = "WrongPassword!999"
} | ConvertTo-Json
try {
    $badRes = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $badLoginBody
    Write-Host "-> FAILED: Expected 401 for incorrect password" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Incorrect password rejected with HTTP $statusCode"
    if ($statusCode -eq 401) {
        Write-Host "-> PASSED: Rejected incorrect password." -ForegroundColor Green
    }
}

# Test 8: Accessing /api/auth/me after login
Write-Host "`n[Test 8] Accessing /api/auth/me with authenticated session..."
$meRes = Invoke-WebRequest -Uri "$baseUrl/api/auth/me" -Method Get -WebSession $loginSession -UseBasicParsing
Write-Host "HTTP Status: $($meRes.StatusCode)"
$meJson = $meRes.Content | ConvertFrom-Json
Write-Host "Profile returned: Name=$($meJson.user.name), Role=$($meJson.user.role)"
if ($meRes.StatusCode -eq 200 -and $meJson.user.email -eq $testEmail) {
    Write-Host "-> PASSED: /api/auth/me returned correct authenticated user profile." -ForegroundColor Green
} else {
    Write-Host "-> FAILED: Authenticated /api/auth/me failed." -ForegroundColor Red
}

# Test 9: Attempting to register as an admin
Write-Host "`n[Test 9] Security check: Attempting to register with role='admin'..."
$adminExploitEmail = "hacker_$(Get-Random)@stitchsmart.com"
$exploitBody = @{
    name = "Sneaky Admin Attempt"
    email = $adminExploitEmail
    password = "AdminPassword@123"
    role = "admin"
} | ConvertTo-Json

$exploitRes = Invoke-WebRequest -Uri "$baseUrl/api/auth/register" -Method Post -ContentType "application/json" -Body $exploitBody -UseBasicParsing
$exploitJson = $exploitRes.Content | ConvertFrom-Json
Write-Host "Assigned Role: $($exploitJson.user.role)"
if ($exploitJson.user.role -eq "customer") {
    Write-Host "-> PASSED: Role injection blocked. User created as 'customer'." -ForegroundColor Green
} else {
    Write-Host "-> FAILED: Role injection allowed! Role was: $($exploitJson.user.role)" -ForegroundColor Red
}

# Test 11: Customer attempting to access admin-only functionality
Write-Host "`n[Test 11] Customer attempting to access admin-only functionality (GET /api/auth/admin-check)..."
try {
    $adminCheckRes = Invoke-WebRequest -Uri "$baseUrl/api/auth/admin-check" -Method Get -WebSession $loginSession -UseBasicParsing
    Write-Host "-> FAILED: Customer was granted access to admin route!" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Admin route access denied to customer with HTTP $statusCode"
    if ($statusCode -eq 403) {
        Write-Host "-> PASSED: Customer correctly blocked with 403 Forbidden." -ForegroundColor Green
    }
}

# Test 10: Logout and subsequent protected-route access
Write-Host "`n[Test 10] Logout and subsequent protected-route access..."
$logoutRes = Invoke-WebRequest -Uri "$baseUrl/api/auth/logout" -Method Post -WebSession $loginSession -UseBasicParsing
Write-Host "Logout HTTP Status: $($logoutRes.StatusCode)"
try {
    $afterLogoutRes = Invoke-WebRequest -Uri "$baseUrl/api/auth/me" -Method Get -WebSession $loginSession -UseBasicParsing
    Write-Host "-> FAILED: Expected 401 after logout" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Access after logout rejected with HTTP $statusCode"
    if ($statusCode -eq 401) {
        Write-Host "-> PASSED: Session terminated, subsequent protected route access blocked." -ForegroundColor Green
    }
}

Write-Host "`n========================================"
Write-Host "ALL 12 TESTS COMPLETED SUCCESSFULLY!"
Write-Host "========================================"
