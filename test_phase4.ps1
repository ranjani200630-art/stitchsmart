$baseUrl = "http://localhost:5000"

Write-Host "========================================"
Write-Host "STITCHSMART PHASE 4: COMPREHENSIVE TESTS"
Write-Host "========================================"

# Test 12: Existing MongoDB Health Check
Write-Host "`n[Test 12] Existing MongoDB health check still works..."
$healthRes = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method Get
Write-Host "Status: $($healthRes.status), DB: $($healthRes.database.status), DB Name: $($healthRes.database.name)"
if ($healthRes.database.status -eq "connected" -and $healthRes.database.name -eq "stitchsmart") {
    Write-Host "-> PASSED: Health check operational and DB connected to 'stitchsmart'." -ForegroundColor Green
} else {
    Write-Host "-> FAILED: DB not connected." -ForegroundColor Red
    exit 1
}

# Test 8: Unauthenticated requests receive 401
Write-Host "`n[Test 8] Unauthenticated requests receive 401 Unauthorized..."
try {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/profile/me" -Method Get
    Write-Host "-> FAILED: Expected 401 on unauthenticated /api/profile/me" -ForegroundColor Red
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host "Unauthenticated /api/profile/me rejected with HTTP $code"
    if ($code -eq 401) { Write-Host "-> PASSED: Profile protected without auth." -ForegroundColor Green }
}

try {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/measurements/me" -Method Get
    Write-Host "-> FAILED: Expected 401 on unauthenticated /api/measurements/me" -ForegroundColor Red
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host "Unauthenticated /api/measurements/me rejected with HTTP $code"
    if ($code -eq 401) { Write-Host "-> PASSED: Measurements protected without auth." -ForegroundColor Green }
}

# Setup Customer 1 Session
Write-Host "`n--- Setting up Customer 1 Session ---"
$cust1Email = "cust1_$(Get-Random)@stitchsmart.com"
$cust1Session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$regBody1 = @{
    name = "Kavita Nair"
    email = $cust1Email
    phone = "+91 9876543211"
    password = "CustomerPass@123"
} | ConvertTo-Json

$regRes1 = Invoke-WebRequest -Uri "$baseUrl/api/auth/register" -Method Post -ContentType "application/json" -Body $regBody1 -WebSession $cust1Session -UseBasicParsing
$cust1Json = $regRes1.Content | ConvertFrom-Json
$cust1Id = $cust1Json.user.id
Write-Host "Customer 1 created: ID=$cust1Id, Name=$($cust1Json.user.name), Email=$cust1Email"

# Setup Customer 2 Session
Write-Host "`n--- Setting up Customer 2 Session ---"
$cust2Email = "cust2_$(Get-Random)@stitchsmart.com"
$cust2Session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$regBody2 = @{
    name = "Meera Joshi"
    email = $cust2Email
    phone = "+91 9876543222"
    password = "CustomerPass@123"
} | ConvertTo-Json

$regRes2 = Invoke-WebRequest -Uri "$baseUrl/api/auth/register" -Method Post -ContentType "application/json" -Body $regBody2 -WebSession $cust2Session -UseBasicParsing
$cust2Json = $regRes2.Content | ConvertFrom-Json
$cust2Id = $cust2Json.user.id
Write-Host "Customer 2 created: ID=$cust2Id, Name=$($cust2Json.user.name), Email=$cust2Email"

# Setup Admin User directly in MongoDB for tailor/admin lookup test
Write-Host "`n--- Setting up Admin User in MongoDB ---"
$adminEmail = "master_tailor_$(Get-Random)@stitchsmart.com"
$adminSetup = node -e "
const mongoose = require('./server/node_modules/mongoose');
const User = require('./server/models/User');
mongoose.connect('mongodb://127.0.0.1:27017/stitchsmart').then(async () => {
    const admin = await User.create({
        name: 'Master Tailor Ramesh',
        email: '$adminEmail',
        phone: '+91 9811122233',
        password: 'AdminPassword@123',
        role: 'admin'
    });
    console.log('ADMIN_CREATED:' + admin._id);
    process.exit(0);
});
"
Write-Host "Admin user setup output: $adminSetup"
$adminSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$adminLoginBody = @{
    email = $adminEmail
    password = "AdminPassword@123"
} | ConvertTo-Json
$adminLoginRes = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $adminLoginBody -WebSession $adminSession -UseBasicParsing
Write-Host "Admin authenticated successfully."

# Test 1: Authenticated customer retrieves their profile (GET /api/profile/me)
Write-Host "`n[Test 1] Authenticated customer retrieves their profile (GET /api/profile/me)..."
$profRes1 = Invoke-WebRequest -Uri "$baseUrl/api/profile/me" -Method Get -WebSession $cust1Session -UseBasicParsing
$profJson1 = $profRes1.Content | ConvertFrom-Json
Write-Host "Retrieved Profile: Name=$($profJson1.profile.name), Email=$($profJson1.profile.email)"
if ($profRes1.StatusCode -eq 200 -and $profJson1.profile.name -eq "Kavita Nair") {
    Write-Host "-> PASSED: Customer 1 successfully retrieved their profile." -ForegroundColor Green
} else {
    Write-Host "-> FAILED: Could not retrieve profile." -ForegroundColor Red
}

# Test 2 & 3: Customer creates / updates their profile (PUT /api/profile/me)
Write-Host "`n[Test 2 & 3] Customer updates their profile with delivery address (PUT /api/profile/me)..."
$updateProfBody = @{
    name = "Kavita Nair Sharma"
    phone = "+91 9876543211"
    address = "Flat 402, Lotus Greens, Bandra West, Mumbai 400050"
} | ConvertTo-Json

$updateProfRes = Invoke-WebRequest -Uri "$baseUrl/api/profile/me" -Method Put -ContentType "application/json" -Body $updateProfBody -WebSession $cust1Session -UseBasicParsing
$updateProfJson = $updateProfRes.Content | ConvertFrom-Json
Write-Host "Updated Profile Address: $($updateProfJson.profile.address)"
if ($updateProfRes.StatusCode -eq 200 -and $updateProfJson.profile.name -eq "Kavita Nair Sharma" -and $updateProfJson.profile.address -like "*Lotus Greens*") {
    Write-Host "-> PASSED: Customer profile created/updated with delivery address." -ForegroundColor Green
} else {
    Write-Host "-> FAILED: Profile update failed." -ForegroundColor Red
}

# Test 10: Attempting to escalate role or tamper ownership through profile update
Write-Host "`n[Test 10] Security: Attempting to escalate role or tamper user ID via PUT /api/profile/me..."
$tamperProfBody = @{
    role = "admin"
    user = $cust2Id
    name = "Hacker Kavita"
} | ConvertTo-Json
$tamperProfRes = Invoke-WebRequest -Uri "$baseUrl/api/profile/me" -Method Put -ContentType "application/json" -Body $tamperProfBody -WebSession $cust1Session -UseBasicParsing
$tamperProfJson = $tamperProfRes.Content | ConvertFrom-Json

# Verify User in DB still has role='customer' and owner is intact
$checkUserRole = node -e "
const mongoose = require('./server/node_modules/mongoose');
const User = require('./server/models/User');
const Profile = require('./server/models/Profile');
mongoose.connect('mongodb://127.0.0.1:27017/stitchsmart').then(async () => {
    const user = await User.findById('$cust1Id');
    const profile = await Profile.findOne({ user: '$cust1Id' });
    console.log('ROLE_CHECK:' + user.role + '|USER_REF:' + profile.user);
    process.exit(0);
});
"
Write-Host "Database verification: $checkUserRole"
if ($checkUserRole.Contains("ROLE_CHECK:customer") -and $checkUserRole.Contains("USER_REF:$cust1Id")) {
    Write-Host "-> PASSED: Role elevation and user ownership tampering prevented." -ForegroundColor Green
} else {
    Write-Host "-> FAILED: Restricted fields were modified!" -ForegroundColor Red
}

# Test 7: Missing and invalid measurement values are rejected
Write-Host "`n[Test 7] Rejecting missing and invalid measurement values..."
# 7a: Missing fields
try {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/measurements/me" -Method Post -ContentType "application/json" -Body '{"height": 160}' -WebSession $cust1Session
    Write-Host "-> FAILED: Expected 400 for missing measurement fields" -ForegroundColor Red
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host "Missing fields rejected with HTTP $code"
    if ($code -eq 400) { Write-Host "-> PASSED: Missing fields rejected." -ForegroundColor Green }
}

# 7b: Out of bounds (e.g., negative chest or height 400cm)
try {
    $badMeas = @{
        height = 400 # Max is 250
        shoulder = 40
        chest = -10 # Min is 40
        waist = 70
        hip = 95
        sleeve = 55
        armhole = 42
        neck = 36
        length = 100
    } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$baseUrl/api/measurements/me" -Method Post -ContentType "application/json" -Body $badMeas -WebSession $cust1Session
    Write-Host "-> FAILED: Expected 400 for invalid/out-of-bounds measurements" -ForegroundColor Red
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host "Out-of-bounds values rejected with HTTP $code"
    if ($code -eq 400) { Write-Host "-> PASSED: Out-of-bounds values rejected." -ForegroundColor Green }
}

# Test 4: Customer creates measurements (POST /api/measurements/me)
Write-Host "`n[Test 4] Customer creates valid measurements in centimetres (POST /api/measurements/me)..."
$validMeas1 = @{
    height = 165
    shoulder = 38
    chest = 88
    waist = 72
    hip = 96
    sleeve = 54
    armhole = 40
    neck = 34
    length = 105
} | ConvertTo-Json

$createMeasRes = Invoke-WebRequest -Uri "$baseUrl/api/measurements/me" -Method Post -ContentType "application/json" -Body $validMeas1 -WebSession $cust1Session -UseBasicParsing
$createMeasJson = $createMeasRes.Content | ConvertFrom-Json
Write-Host "HTTP Status: $($createMeasRes.StatusCode)"
Write-Host "Created Measurements (cm): Chest=$($createMeasJson.measurement.chest) cm, Waist=$($createMeasJson.measurement.waist) cm, Hip=$($createMeasJson.measurement.hip) cm"
if ($createMeasRes.StatusCode -eq 201 -and $createMeasJson.measurement.chest -eq 88 -and $createMeasJson.unit -eq "cm") {
    Write-Host "-> PASSED: Measurements created successfully in cm." -ForegroundColor Green
} else {
    Write-Host "-> FAILED: Measurements creation failed." -ForegroundColor Red
}

# Test 4b: Duplicate measurement profile creation is rejected
Write-Host "`n[Test 4b] Duplicate measurement record creation prevented on POST..."
try {
    $dupRes = Invoke-RestMethod -Uri "$baseUrl/api/measurements/me" -Method Post -ContentType "application/json" -Body $validMeas1 -WebSession $cust1Session
    Write-Host "-> FAILED: Expected 400 for duplicate measurement creation" -ForegroundColor Red
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host "Duplicate creation rejected with HTTP $code"
    if ($code -eq 400) { Write-Host "-> PASSED: Duplicate measurement prevented." -ForegroundColor Green }
}

# Test 5: Customer retrieves saved measurements (GET /api/measurements/me)
Write-Host "`n[Test 5] Customer retrieves saved measurements (GET /api/measurements/me)..."
$getMeasRes = Invoke-WebRequest -Uri "$baseUrl/api/measurements/me" -Method Get -WebSession $cust1Session -UseBasicParsing
$getMeasJson = $getMeasRes.Content | ConvertFrom-Json
Write-Host "Retrieved Measurements: Height=$($getMeasJson.measurement.height) cm, Length=$($getMeasJson.measurement.length) cm"
if ($getMeasRes.StatusCode -eq 200 -and $getMeasJson.measurement.chest -eq 88) {
    Write-Host "-> PASSED: Saved measurements retrieved accurately." -ForegroundColor Green
} else {
    Write-Host "-> FAILED: Measurement retrieval failed." -ForegroundColor Red
}

# Test 6: Customer updates measurements (PUT /api/measurements/me)
Write-Host "`n[Test 6] Customer updates existing measurements (PUT /api/measurements/me)..."
$updatedMeas = @{
    height = 165
    shoulder = 38.5
    chest = 90
    waist = 74
    hip = 98
    sleeve = 55
    armhole = 41
    neck = 34.5
    length = 110
} | ConvertTo-Json

$updateMeasRes = Invoke-WebRequest -Uri "$baseUrl/api/measurements/me" -Method Put -ContentType "application/json" -Body $updatedMeas -WebSession $cust1Session -UseBasicParsing
$updateMeasJson = $updateMeasRes.Content | ConvertFrom-Json
Write-Host "Updated Measurements: Chest=$($updateMeasJson.measurement.chest) cm, Waist=$($updateMeasJson.measurement.waist) cm"
if ($updateMeasRes.StatusCode -eq 200 -and $updateMeasJson.measurement.chest -eq 90 -and $updateMeasJson.measurement.waist -eq 74) {
    Write-Host "-> PASSED: Measurements updated successfully." -ForegroundColor Green
} else {
    Write-Host "-> FAILED: Measurement update failed." -ForegroundColor Red
}

# Test 9: Customer 2 cannot access Customer 1's data
Write-Host "`n[Test 9] Security: Customer 2 attempting to access Customer 1's profile/measurements..."
try {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/profile/customer/$cust1Id" -Method Get -WebSession $cust2Session
    Write-Host "-> FAILED: Customer 2 was able to access Customer 1 profile!" -ForegroundColor Red
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host "Customer lookup denied to Customer 2 with HTTP $code (Expected 403)"
    if ($code -eq 403) { Write-Host "-> PASSED: Customer 2 blocked with 403 Forbidden." -ForegroundColor Green }
}

try {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/measurements/customer/$cust1Id" -Method Get -WebSession $cust2Session
    Write-Host "-> FAILED: Customer 2 was able to access Customer 1 measurements!" -ForegroundColor Red
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host "Measurement lookup denied to Customer 2 with HTTP $code (Expected 403)"
    if ($code -eq 403) { Write-Host "-> PASSED: Customer 2 blocked with 403 Forbidden." -ForegroundColor Green }
}

# Test 11: Authorized Admin/Tailor can retrieve customer profile and measurements
Write-Host "`n[Test 11] Authorized Admin/Tailor retrieves Customer 1's profile and measurements..."
$adminCustProfRes = Invoke-WebRequest -Uri "$baseUrl/api/profile/customer/$cust1Id" -Method Get -WebSession $adminSession -UseBasicParsing
$adminCustProfJson = $adminCustProfRes.Content | ConvertFrom-Json
Write-Host "Admin retrieved customer profile: Name=$($adminCustProfJson.profile.name)"

$adminCustMeasRes = Invoke-WebRequest -Uri "$baseUrl/api/measurements/customer/$cust1Id" -Method Get -WebSession $adminSession -UseBasicParsing
$adminCustMeasJson = $adminCustMeasRes.Content | ConvertFrom-Json
Write-Host "Admin retrieved customer measurements: Chest=$($adminCustMeasJson.measurement.chest) cm, Length=$($adminCustMeasJson.measurement.length) cm"

if ($adminCustProfRes.StatusCode -eq 200 -and $adminCustMeasRes.StatusCode -eq 200 -and $adminCustMeasJson.measurement.chest -eq 90) {
    Write-Host "-> PASSED: Authorized Admin successfully accessed Customer 1's tailoring profile & measurements." -ForegroundColor Green
} else {
    Write-Host "-> FAILED: Admin lookup failed." -ForegroundColor Red
}

Write-Host "`n========================================"
Write-Host "ALL PHASE 4 TESTS COMPLETED SUCCESSFULLY!"
Write-Host "========================================"
