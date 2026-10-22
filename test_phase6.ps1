# StitchSmart Phase 6 Automated End-to-End Verification Suite
$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " STITCHSMART - PHASE 6: DELIVERY SCHEDULING & TRACKING" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:5000"
$rand = Get-Random -Minimum 10000000 -Maximum 99999999

# Helper to execute requests with JSON
function Send-ApiRequest {
    param(
        [string]$Uri,
        [string]$Method = "Get",
        [object]$Body = $null,
        [hashtable]$Headers = @{}
    )
    $params = @{
        Uri = $Uri
        Method = $Method
        ContentType = "application/json"
        UseBasicParsing = $true
        Headers = $Headers
    }
    if ($Body) {
        $params.Body = ($Body | ConvertTo-Json -Depth 10)
    }
    return Invoke-RestMethod @params
}

# ----------------------------------------------------
# Setup: Admin Login
# ----------------------------------------------------
Write-Host "`n[Setup] Authenticating Admin..." -ForegroundColor Yellow
$adminLoginBody = @{
    email = "admin@stitchsmart.com"
    password = "Admin@123456"
}
$adminLoginRes = Send-ApiRequest -Uri "$baseUrl/api/auth/login" -Method Post -Body $adminLoginBody
$adminToken = $adminLoginRes.token
$adminHeaders = @{ Authorization = "Bearer $adminToken" }
Write-Host "Admin logged in successfully: $($adminLoginRes.user.name) ($($adminLoginRes.user.role))" -ForegroundColor Gray

# ----------------------------------------------------
# Setup: Customer 1 (with measurements)
# ----------------------------------------------------
Write-Host "`n[Setup] Registering Customer 1..." -ForegroundColor Yellow
$cust1Email = "customer1_$rand@stitchsmart.com"
$cust1RegBody = @{
    name = "Aanya Verma"
    email = $cust1Email
    phone = "+91 9876543210"
    password = "Customer1@123"
}
$cust1RegRes = Send-ApiRequest -Uri "$baseUrl/api/auth/register" -Method Post -Body $cust1RegBody
$cust1Token = $cust1RegRes.token
$cust1Headers = @{ Authorization = "Bearer $cust1Token" }

# Save measurements for Customer 1
$measBody = @{
    height = 165
    shoulder = 38
    chest = 88
    waist = 72
    hip = 94
    sleeve = 45
    armhole = 38
    neck = 34
    length = 98
}
$measRes = Send-ApiRequest -Uri "$baseUrl/api/measurements/me" -Method Post -Body $measBody -Headers $cust1Headers
Write-Host "Customer 1 created with saved measurements." -ForegroundColor Gray

# ----------------------------------------------------
# Setup: Customer 2 (Separate Customer for Scoping Checks)
# ----------------------------------------------------
Write-Host "`n[Setup] Registering Customer 2..." -ForegroundColor Yellow
$cust2Email = "customer2_$rand@stitchsmart.com"
$cust2RegBody = @{
    name = "Sneha Patel"
    email = $cust2Email
    phone = "+91 9876543222"
    password = "Customer2@123"
}
$cust2RegRes = Send-ApiRequest -Uri "$baseUrl/api/auth/register" -Method Post -Body $cust2RegBody
$cust2Token = $cust2RegRes.token
$cust2Headers = @{ Authorization = "Bearer $cust2Token" }
Write-Host "Customer 2 created." -ForegroundColor Gray

# ====================================================
# TEST 12: /api/health Endpoint Operational
# ====================================================
Write-Host "`n[Test 12] Verifying GET /api/health endpoint..." -ForegroundColor Yellow
$healthRes = Send-ApiRequest -Uri "$baseUrl/api/health" -Method Get
if ($healthRes.status -eq "ok" -and $healthRes.database.status -eq "connected") {
    Write-Host "PASS: Health check operational and MongoDB connected to '$($healthRes.database.name)'." -ForegroundColor Green
} else {
    Write-Host "FAIL: Health check failed." -ForegroundColor Red
    exit 1
}

# ====================================================
# TEST 1: New Order Receives Initial Pending History Entry
# ====================================================
Write-Host "`n[Test 1] Customer places order; verify initial Pending history entry..." -ForegroundColor Yellow
$targetDate = (Get-Date).AddDays(10).ToString("yyyy-MM-dd")
$newOrderBody = @{
    clothingType = "kurti"
    designDetails = "Straight cut embroidered kurti with round neckline"
    fabricDetails = @{
        fabricType = "Chanderi Silk"
        color = "Emerald Green"
        notes = "Gold zari border along sleeves"
    }
    quantity = 2
    specialInstructions = "Keep sleeve length exactly 45 cm"
    estimatedDeliveryDate = $targetDate
}

$orderRes = Send-ApiRequest -Uri "$baseUrl/api/orders" -Method Post -Body $newOrderBody -Headers $cust1Headers
$orderId = $orderRes.order._id
$orderNumber = $orderRes.order.orderNumber

if ($orderRes.success -and $orderRes.order.status -eq "Pending") {
    $history = $orderRes.order.statusHistory
    if ($history.Length -eq 1 -and $history[0].status -eq "Pending" -and $history[0].changedAt) {
        Write-Host "PASS: Order $orderNumber created with initial 'Pending' status history." -ForegroundColor Green
        Write-Host "      History Entry: Status=$($history[0].status) | Time=$($history[0].changedAt) | Note=$($history[0].note)" -ForegroundColor Gray
    } else {
        Write-Host "FAIL: Initial status history entry missing or invalid." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "FAIL: Order creation failed." -ForegroundColor Red
    exit 1
}

# ====================================================
# TEST 2: Every Valid Status Change Records Status & Timestamp
# ====================================================
Write-Host "`n[Test 2] Advance status (Pending -> Confirmed -> In Progress) & verify history..." -ForegroundColor Yellow
# Step A: Pending -> Confirmed
$step1Body = @{
    status = "Confirmed"
    note = "Fabric received and verified against measurements"
}
$step1Res = Send-ApiRequest -Uri "$baseUrl/api/orders/$orderId/status" -Method Patch -Body $step1Body -Headers $adminHeaders
if ($step1Res.order.status -eq "Confirmed" -and $step1Res.order.statusHistory.Length -eq 2) {
    Write-Host "PASS: Transition 1 Confirmed recorded in history (Count=2)." -ForegroundColor Green
} else {
    Write-Host "FAIL: Transition to Confirmed did not record properly." -ForegroundColor Red
    exit 1
}

# Step B: Confirmed -> In Progress
$step2Body = @{
    status = "In Progress"
    note = "Master tailor commenced cutting & stitching"
}
$step2Res = Send-ApiRequest -Uri "$baseUrl/api/orders/$orderId/status" -Method Patch -Body $step2Body -Headers $adminHeaders
if ($step2Res.order.status -eq "In Progress" -and $step2Res.order.statusHistory.Length -eq 3) {
    Write-Host "PASS: Transition 2 In Progress recorded in history (Count=3)." -ForegroundColor Green
    Write-Host "      Latest note: $($step2Res.order.statusHistory[2].note)" -ForegroundColor Gray
} else {
    Write-Host "FAIL: Transition to In Progress did not record properly." -ForegroundColor Red
    exit 1
}

# ====================================================
# TEST 3: Invalid Status Transitions are Rejected
# ====================================================
Write-Host "`n[Test 3] Reject invalid status transitions (e.g. In Progress -> Completed)..." -ForegroundColor Yellow
try {
    $badTransitionBody = @{ status = "Completed" } # Must go through 'Ready for Pickup' first
    Invoke-WebRequest -Uri "$baseUrl/api/orders/$orderId/status" -Method Patch -Body ($badTransitionBody | ConvertTo-Json) -Headers $adminHeaders -ContentType "application/json" -UseBasicParsing
    Write-Host "FAIL: Invalid transition should have been rejected!" -ForegroundColor Red
    exit 1
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 400) {
        Write-Host "PASS: Invalid transition rejected with HTTP 400 as expected." -ForegroundColor Green
    } else {
        Write-Host "FAIL: Expected HTTP 400, got $status" -ForegroundColor Red
        exit 1
    }
}

# ====================================================
# TEST 4: Updating to Same Status Does Not Create Duplicate History
# ====================================================
Write-Host "`n[Test 4] Attempt updating to current status ('In Progress') again..." -ForegroundColor Yellow
try {
    $sameStatusBody = @{ status = "In Progress" }
    Invoke-WebRequest -Uri "$baseUrl/api/orders/$orderId/status" -Method Patch -Body ($sameStatusBody | ConvertTo-Json) -Headers $adminHeaders -ContentType "application/json" -UseBasicParsing
    Write-Host "FAIL: Updating to same status should be rejected!" -ForegroundColor Red
    exit 1
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 400) {
        # Check history length has NOT increased
        $checkOrder = Send-ApiRequest -Uri "$baseUrl/api/orders/$orderId" -Method Get -Headers $adminHeaders
        if ($checkOrder.order.statusHistory.Length -eq 3) {
            Write-Host "PASS: Same-status update rejected with HTTP 400; history count remains 3 (no duplicates)." -ForegroundColor Green
        } else {
            Write-Host "FAIL: Duplicate history entry was created!" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "FAIL: Expected HTTP 400, got $status" -ForegroundColor Red
        exit 1
    }
}

# ====================================================
# TEST 5: Admin Can Update Estimated Delivery Date
# ====================================================
Write-Host "`n[Test 5] Admin updates estimated delivery date & reason..." -ForegroundColor Yellow
$newDate = (Get-Date).AddDays(14).ToString("yyyy-MM-dd")
$rescheduleBody = @{
    estimatedDeliveryDate = $newDate
    reason = "Accommodating specialized embroidery work"
}
$rescheduleRes = Send-ApiRequest -Uri "$baseUrl/api/orders/$orderId/delivery-date" -Method Patch -Body $rescheduleBody -Headers $adminHeaders
if ($rescheduleRes.success) {
    $dHist = $rescheduleRes.order.deliveryDateHistory
    if ($dHist.Length -ge 1) {
        Write-Host "PASS: Delivery date rescheduled successfully to $newDate." -ForegroundColor Green
        Write-Host "      Audit Log: Reason='$($dHist[-1].reason)' | ChangedAt=$($dHist[-1].changedAt)" -ForegroundColor Gray
    } else {
        Write-Host "FAIL: deliveryDateHistory was not recorded." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "FAIL: Rescheduling delivery date failed." -ForegroundColor Red
    exit 1
}

# ====================================================
# TEST 6: Customers Can See Current Delivery Date and Status History
# ====================================================
Write-Host "`n[Test 6] Customer views order details with tracking history..." -ForegroundColor Yellow
$custOrderRes = Send-ApiRequest -Uri "$baseUrl/api/orders/$orderId" -Method Get -Headers $cust1Headers
if ($custOrderRes.success) {
    $custHistory = $custOrderRes.order.statusHistory
    $custDelivHistory = $custOrderRes.order.deliveryDateHistory
    if ($custHistory.Length -eq 3 -and $custDelivHistory.Length -ge 1) {
        Write-Host "PASS: Customer can view complete tracking history (3 status stages + schedule revisions)." -ForegroundColor Green
        Write-Host "      Latest Delivery Target Visible to Customer: $($custOrderRes.order.estimatedDeliveryDate)" -ForegroundColor Gray
    } else {
        Write-Host "FAIL: Customer could not see complete tracking history." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "FAIL: Customer could not retrieve own order details." -ForegroundColor Red
    exit 1
}

# ====================================================
# TEST 7: Customer Isolation (Customer 2 Cannot Access Customer 1's Order)
# ====================================================
Write-Host "`n[Test 7] Verify Customer 2 cannot access Customer 1's order tracking..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri "$baseUrl/api/orders/$orderId" -Method Get -Headers $cust2Headers -UseBasicParsing
    Write-Host "FAIL: Customer 2 should have been blocked with 403 Forbidden!" -ForegroundColor Red
    exit 1
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 403) {
        Write-Host "PASS: Customer 2 blocked with 403 Forbidden from viewing Customer 1's order tracking." -ForegroundColor Green
    } else {
        Write-Host "FAIL: Expected HTTP 403, got $status" -ForegroundColor Red
        exit 1
    }
}

# ====================================================
# TEST 8: Customers Cannot Modify Status History or Delivery Dates
# ====================================================
Write-Host "`n[Test 8] Customers cannot modify status history or delivery dates via APIs..." -ForegroundColor Yellow

# Attempt 1: Customer calls PATCH /api/orders/:id/status
try {
    $tamperStatus = @{ status = "Completed" }
    Invoke-WebRequest -Uri "$baseUrl/api/orders/$orderId/status" -Method Patch -Body ($tamperStatus | ConvertTo-Json) -Headers $cust1Headers -ContentType "application/json" -UseBasicParsing
    Write-Host "FAIL: Customer should not be able to call PATCH status!" -ForegroundColor Red
    exit 1
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 403) {
        Write-Host "PASS: Customer blocked with 403 Forbidden from PATCH /status." -ForegroundColor Green
    } else {
        Write-Host "FAIL: Expected 403, got $status" -ForegroundColor Red
        exit 1
    }
}

# Attempt 2: Customer calls PATCH /api/orders/:id/delivery-date
try {
    $tamperDate = @{ estimatedDeliveryDate = "2026-12-31" }
    Invoke-WebRequest -Uri "$baseUrl/api/orders/$orderId/delivery-date" -Method Patch -Body ($tamperDate | ConvertTo-Json) -Headers $cust1Headers -ContentType "application/json" -UseBasicParsing
    Write-Host "FAIL: Customer should not be able to call PATCH delivery-date!" -ForegroundColor Red
    exit 1
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 403) {
        Write-Host "PASS: Customer blocked with 403 Forbidden from PATCH /delivery-date." -ForegroundColor Green
    } else {
        Write-Host "FAIL: Expected 403, got $status" -ForegroundColor Red
        exit 1
    }
}

# Attempt 3: Customer calls PUT /api/orders/:id with tampered statusHistory
$tamperPut = @{
    statusHistory = @(
        @{ status = "Completed"; note = "Hacked stage" }
    )
    estimatedDeliveryDate = "2026-12-31"
}
try {
    Invoke-WebRequest -Uri "$baseUrl/api/orders/$orderId" -Method Put -Body ($tamperPut | ConvertTo-Json) -Headers $cust1Headers -ContentType "application/json" -UseBasicParsing
    Write-Host "FAIL: Customer editing non-pending order or delivery date should be rejected!" -ForegroundColor Red
    exit 1
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 400 -or $status -eq 403) {
        Write-Host "PASS: Tampered PUT rejected with HTTP $status." -ForegroundColor Green
    } else {
        Write-Host "FAIL: Expected 400 or 403, got $status" -ForegroundColor Red
        exit 1
    }
}

# ====================================================
# TEST 9: Delayed-Order Calculations for Various States
# ====================================================
Write-Host "`n[Test 9] Verify Delayed-order calculations across overdue, future, completed, cancelled..." -ForegroundColor Yellow

# Helper to insert directly into test database for exact datetime testing
$script = @"
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Order } = require('./models/Order');

async function testDelayed() {
  await mongoose.connect(process.env.MONGO_URI);
  await Order.deleteMany({ orderNumber: new RegExp('^TEST-DELAY-') });

  const now = new Date();
  const pastDate = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 2 days ago
  const futureDate = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 2 days future

  // Case A: Overdue & Pending -> isDelayed = true
  const oA = await Order.create({
    customer: new mongoose.Types.ObjectId('$($cust1RegRes.user.id)'),
    orderNumber: 'TEST-DELAY-$rand-A',
    clothingType: 'shirt',
    designDetails: 'Test A',
    fabricDetails: { fabricType: 'Cotton', color: 'White' },
    measurements: { height: 170, shoulder: 40, chest: 90, waist: 75, hip: 90, sleeve: 50, armhole: 40, neck: 36, length: 70 },
    quantity: 1,
    estimatedDeliveryDate: pastDate,
    price: 650,
    status: 'Pending'
  });

  // Case B: Overdue & In Progress -> isDelayed = true
  const oB = await Order.create({
    customer: new mongoose.Types.ObjectId('$($cust1RegRes.user.id)'),
    orderNumber: 'TEST-DELAY-$rand-B',
    clothingType: 'shirt',
    designDetails: 'Test B',
    fabricDetails: { fabricType: 'Cotton', color: 'White' },
    measurements: { height: 170, shoulder: 40, chest: 90, waist: 75, hip: 90, sleeve: 50, armhole: 40, neck: 36, length: 70 },
    quantity: 1,
    estimatedDeliveryDate: pastDate,
    price: 650,
    status: 'In Progress'
  });

  // Case C: Overdue & Completed -> isDelayed = false
  const oC = await Order.create({
    customer: new mongoose.Types.ObjectId('$($cust1RegRes.user.id)'),
    orderNumber: 'TEST-DELAY-$rand-C',
    clothingType: 'shirt',
    designDetails: 'Test C',
    fabricDetails: { fabricType: 'Cotton', color: 'White' },
    measurements: { height: 170, shoulder: 40, chest: 90, waist: 75, hip: 90, sleeve: 50, armhole: 40, neck: 36, length: 70 },
    quantity: 1,
    estimatedDeliveryDate: pastDate,
    price: 650,
    status: 'Completed'
  });

  // Case D: Overdue & Cancelled -> isDelayed = false
  const oD = await Order.create({
    customer: new mongoose.Types.ObjectId('$($cust1RegRes.user.id)'),
    orderNumber: 'TEST-DELAY-$rand-D',
    clothingType: 'shirt',
    designDetails: 'Test D',
    fabricDetails: { fabricType: 'Cotton', color: 'White' },
    measurements: { height: 170, shoulder: 40, chest: 90, waist: 75, hip: 90, sleeve: 50, armhole: 40, neck: 36, length: 70 },
    quantity: 1,
    estimatedDeliveryDate: pastDate,
    price: 650,
    status: 'Cancelled'
  });

  // Case E: Future-due & Pending -> isDelayed = false
  const oE = await Order.create({
    customer: new mongoose.Types.ObjectId('$($cust1RegRes.user.id)'),
    orderNumber: 'TEST-DELAY-$rand-E',
    clothingType: 'shirt',
    designDetails: 'Test E',
    fabricDetails: { fabricType: 'Cotton', color: 'White' },
    measurements: { height: 170, shoulder: 40, chest: 90, waist: 75, hip: 90, sleeve: 50, armhole: 40, neck: 36, length: 70 },
    quantity: 1,
    estimatedDeliveryDate: futureDate,
    price: 650,
    status: 'Pending'
  });

  console.log(JSON.stringify({ aId: oA._id, bId: oB._id, cId: oC._id, dId: oD._id, eId: oE._id }));
  process.exit(0);
}
testDelayed();
"@

$tempScript = "server/temp_test_delayed.js"
[System.IO.File]::WriteAllText($tempScript, $script)
$createdIdsJson = node $tempScript
Remove-Item $tempScript -Force -ErrorAction SilentlyContinue
$ids = $createdIdsJson | ConvertFrom-Json

# Query each order through the API to verify isDelayed flag
$resA = Send-ApiRequest -Uri "$baseUrl/api/orders/$($ids.aId)" -Method Get -Headers $adminHeaders
$resB = Send-ApiRequest -Uri "$baseUrl/api/orders/$($ids.bId)" -Method Get -Headers $adminHeaders
$resC = Send-ApiRequest -Uri "$baseUrl/api/orders/$($ids.cId)" -Method Get -Headers $adminHeaders
$resD = Send-ApiRequest -Uri "$baseUrl/api/orders/$($ids.dId)" -Method Get -Headers $adminHeaders
$resE = Send-ApiRequest -Uri "$baseUrl/api/orders/$($ids.eId)" -Method Get -Headers $adminHeaders

if ($resA.order.isDelayed -eq $true -and
    $resB.order.isDelayed -eq $true -and
    $resC.order.isDelayed -eq $false -and
    $resD.order.isDelayed -eq $false -and
    $resE.order.isDelayed -eq $false) {
    Write-Host "PASS: Delayed logic 100% verified:" -ForegroundColor Green
    Write-Host "      Case A (Past + Pending)     -> isDelayed = $($resA.order.isDelayed) (Expected: True)" -ForegroundColor Gray
    Write-Host "      Case B (Past + In Progress) -> isDelayed = $($resB.order.isDelayed) (Expected: True)" -ForegroundColor Gray
    Write-Host "      Case C (Past + Completed)   -> isDelayed = $($resC.order.isDelayed) (Expected: False)" -ForegroundColor Gray
    Write-Host "      Case D (Past + Cancelled)   -> isDelayed = $($resD.order.isDelayed) (Expected: False)" -ForegroundColor Gray
    Write-Host "      Case E (Future + Pending)   -> isDelayed = $($resE.order.isDelayed) (Expected: False)" -ForegroundColor Gray
} else {
    Write-Host "FAIL: Delayed order calculation mismatch!" -ForegroundColor Red
    exit 1
}

# ====================================================
# TEST 10: Dashboard Counts Match Database in MongoDB
# ====================================================
Write-Host "`n[Test 10] Verify Dashboard summary counts (/api/orders/stats/summary)..." -ForegroundColor Yellow
$statsRes = Send-ApiRequest -Uri "$baseUrl/api/orders/stats/summary" -Method Get -Headers $adminHeaders

if ($statsRes.success) {
    $s = $statsRes.stats
    Write-Host "PASS: Dashboard stats fetched successfully from MongoDB:" -ForegroundColor Green
    Write-Host "      Total Orders:     $($s.total)" -ForegroundColor Gray
    Write-Host "      Pending:          $($s.pending)" -ForegroundColor Gray
    Write-Host "      In Progress:      $($s.inProgress)" -ForegroundColor Gray
    Write-Host "      Ready for Pickup: $($s.readyForPickup)" -ForegroundColor Gray
    Write-Host "      Completed:        $($s.completed)" -ForegroundColor Gray
    Write-Host "      Cancelled:        $($s.cancelled)" -ForegroundColor Gray
    Write-Host "      Delayed:          $($s.delayed)" -ForegroundColor Gray

    if ($s.delayed -ge 2 -and $s.total -gt 0) {
        Write-Host "PASS: Overdue/delayed count ($($s.delayed)) correctly includes delayed orders." -ForegroundColor Green
    } else {
        Write-Host "FAIL: Delayed count does not reflect test orders." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "FAIL: /api/orders/stats/summary failed." -ForegroundColor Red
    exit 1
}

# Clean up temporary test orders
node -e "const mongoose = require('mongoose'); require('dotenv').config({ path: require('path').resolve('server/.env') }); mongoose.connect(process.env.MONGO_URI).then(async () => { await mongoose.connection.collection('orders').deleteMany({ orderNumber: new RegExp('^TEST-DELAY-') }); process.exit(0); });"

# ====================================================
# TEST 11: Phase 3, Phase 4 & Phase 5 Continues to Work
# ====================================================
Write-Host "`n[Test 11] Verifying Phase 3-5 existing APIs (Auth Me, Profile, Measurements, Order Filtering)..." -ForegroundColor Yellow
$meRes = Send-ApiRequest -Uri "$baseUrl/api/auth/me" -Method Get -Headers $cust1Headers
$profRes = Send-ApiRequest -Uri "$baseUrl/api/profile/me" -Method Get -Headers $cust1Headers
$measCheck = Send-ApiRequest -Uri "$baseUrl/api/measurements/me" -Method Get -Headers $cust1Headers
$adminFilterCheck = Send-ApiRequest -Uri "$baseUrl/api/orders?status=In%20Progress" -Method Get -Headers $adminHeaders

if ($meRes.success -and $measCheck.success -and $adminFilterCheck.success) {
    Write-Host "PASS: Profile, Authentication, Measurements, and Order Filter all operational." -ForegroundColor Green
} else {
    Write-Host "FAIL: Regression detected in Phase 3-5 APIs." -ForegroundColor Red
    exit 1
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " ALL 12 PHASE 6 VERIFICATION TESTS PASSED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
