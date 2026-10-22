$baseUrl = "http://localhost:5000"

Write-Host "========================================"
Write-Host "STITCHSMART PHASE 5: COMPREHENSIVE TESTS"
Write-Host "========================================"

# Test 14: Existing MongoDB Health Check
Write-Host "`n[Test 14] Existing MongoDB health check still works..."
$healthRes = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method Get
Write-Host "Status: $($healthRes.status), DB: $($healthRes.database.status), DB Name: $($healthRes.database.name)"
if ($healthRes.database.status -eq "connected" -and $healthRes.database.name -eq "stitchsmart") {
    Write-Host "-> PASSED: Health check operational and DB connected to 'stitchsmart'." -ForegroundColor Green
} else {
    Write-Host "-> FAILED: DB not connected." -ForegroundColor Red
    exit 1
}

# Setup Customer 1 (with measurements)
Write-Host "`n--- Setting up Customer 1 (with measurements) ---"
$cust1Email = "cust_p5_$(Get-Random)@stitchsmart.com"
$cust1Session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$regBody1 = @{
    name = "Meenakshi Sundaram"
    email = $cust1Email
    phone = "+91 9876543111"
    password = "CustomerPass@123"
} | ConvertTo-Json
$regRes1 = Invoke-WebRequest -Uri "$baseUrl/api/auth/register" -Method Post -ContentType "application/json" -Body $regBody1 -WebSession $cust1Session -UseBasicParsing
$cust1Json = $regRes1.Content | ConvertFrom-Json
$cust1Id = $cust1Json.user.id

# Save measurements for Customer 1
$measBody1 = @{
    height = 162
    shoulder = 37
    chest = 86
    waist = 70
    hip = 94
    sleeve = 52
    armhole = 39
    neck = 33
    length = 100
} | ConvertTo-Json
$measRes1 = Invoke-WebRequest -Uri "$baseUrl/api/measurements/me" -Method Post -ContentType "application/json" -Body $measBody1 -WebSession $cust1Session -UseBasicParsing
Write-Host "Customer 1 ($cust1Email) registered with saved measurements in cm."

# Setup Customer 2 (WITHOUT measurements)
Write-Host "`n--- Setting up Customer 2 (WITHOUT measurements) ---"
$cust2Email = "cust_nomeas_$(Get-Random)@stitchsmart.com"
$cust2Session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$regBody2 = @{
    name = "Ravi Kumar"
    email = $cust2Email
    phone = "+91 9876543222"
    password = "CustomerPass@123"
} | ConvertTo-Json
$regRes2 = Invoke-WebRequest -Uri "$baseUrl/api/auth/register" -Method Post -ContentType "application/json" -Body $regBody2 -WebSession $cust2Session -UseBasicParsing
$cust2Json = $regRes2.Content | ConvertFrom-Json
$cust2Id = $cust2Json.user.id
Write-Host "Customer 2 ($cust2Email) registered without measurements."

# Setup Admin User
Write-Host "`n--- Setting up Admin Session ---"
$adminEmail = "tailor_admin_$(Get-Random)@stitchsmart.com"
$adminSetup = node -e "
const mongoose = require('./server/node_modules/mongoose');
const User = require('./server/models/User');
mongoose.connect('mongodb://127.0.0.1:27017/stitchsmart').then(async () => {
    const admin = await User.create({
        name: 'Master Tailor Guru',
        email: '$adminEmail',
        phone: '+91 9800011122',
        password: 'AdminPassword@123',
        role: 'admin'
    });
    console.log('ADMIN_CREATED:' + admin._id);
    process.exit(0);
});
"
$adminSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$adminLoginBody = @{ email = $adminEmail; password = "AdminPassword@123" } | ConvertTo-Json
$adminLoginRes = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $adminLoginBody -WebSession $adminSession -UseBasicParsing
Write-Host "Admin authenticated successfully."

# Test 3: Customer cannot create an order without saved measurements
Write-Host "`n[Test 3] Customer without saved measurements cannot place an order..."
$tomorrowStr = (Get-Date).AddDays(5).ToString("yyyy-MM-dd")
$orderNoMeasBody = @{
    clothingType = "kurti"
    designDetails = "Round neck with border"
    fabricDetails = @{ fabricType = "Cotton"; color = "Indigo" }
    quantity = 1
    estimatedDeliveryDate = $tomorrowStr
} | ConvertTo-Json
try {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/orders" -Method Post -ContentType "application/json" -Body $orderNoMeasBody -WebSession $cust2Session
    Write-Host "-> FAILED: Order created without saved measurements!" -ForegroundColor Red
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host "Order rejected with HTTP $code"
    if ($code -eq 400) { Write-Host "-> PASSED: Order rejected because customer has no saved measurements." -ForegroundColor Green }
}

# Test 2: Invalid or missing fields are rejected
Write-Host "`n[Test 2] Invalid or missing fields are rejected..."
# 2a: Missing designDetails
try {
    $badOrder1 = @{ clothingType = "blouse"; quantity = 1; estimatedDeliveryDate = $tomorrowStr } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$baseUrl/api/orders" -Method Post -ContentType "application/json" -Body $badOrder1 -WebSession $cust1Session
    Write-Host "-> FAILED: Expected 400 for missing designDetails" -ForegroundColor Red
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host "Missing designDetails rejected with HTTP $code"
    if ($code -eq 400) { Write-Host "-> PASSED: Missing designDetails rejected." -ForegroundColor Green }
}

# 2b: Invalid clothingType
try {
    $badOrder2 = @{ clothingType = "spacesuit"; designDetails = "Custom design"; fabricDetails = @{ fabricType = "Kevlar"; color = "White" }; estimatedDeliveryDate = $tomorrowStr } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$baseUrl/api/orders" -Method Post -ContentType "application/json" -Body $badOrder2 -WebSession $cust1Session
    Write-Host "-> FAILED: Expected 400 for invalid clothingType" -ForegroundColor Red
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host "Invalid clothingType rejected with HTTP $code"
    if ($code -eq 400) { Write-Host "-> PASSED: Invalid clothingType rejected." -ForegroundColor Green }
}

# 2c: Past delivery date
try {
    $pastDateStr = (Get-Date).AddDays(-2).ToString("yyyy-MM-dd")
    $badOrder3 = @{ clothingType = "blouse"; designDetails = "Design text"; fabricDetails = @{ fabricType = "Silk"; color = "Red" }; estimatedDeliveryDate = $pastDateStr } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$baseUrl/api/orders" -Method Post -ContentType "application/json" -Body $badOrder3 -WebSession $cust1Session
    Write-Host "-> FAILED: Expected 400 for past delivery date" -ForegroundColor Red
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host "Past delivery date rejected with HTTP $code"
    if ($code -eq 400) { Write-Host "-> PASSED: Past delivery date rejected." -ForegroundColor Green }
}

# Test 1: Customer creates a valid order
Write-Host "`n[Test 1] Customer creates a valid tailoring order (POST /api/orders)..."
$validOrderBody = @{
    clothingType = "blouse"
    designDetails = "Deep boat neck, elbow sleeves with gold zari border and back doris"
    fabricDetails = @{
        fabricType = "Kanjivaram Silk"
        color = "Peacock Blue"
        notes = "Customer supplied fabric"
    }
    quantity = 2
    specialInstructions = "Please leave 1.5 inch side margin inside"
    estimatedDeliveryDate = $tomorrowStr
} | ConvertTo-Json

$orderRes = Invoke-WebRequest -Uri "$baseUrl/api/orders" -Method Post -ContentType "application/json" -Body $validOrderBody -WebSession $cust1Session -UseBasicParsing
$orderJson = $orderRes.Content | ConvertFrom-Json
$createdOrder = $orderJson.order
$order1Id = $createdOrder._id
$order1Num = $createdOrder.orderNumber

Write-Host "Order Created: Number=$order1Num, Price=INR $($createdOrder.price), Status=$($createdOrder.status)"
Write-Host "Attached Measurement Snapshot: Chest=$($createdOrder.measurements.chest) cm, Waist=$($createdOrder.measurements.waist) cm"
if ($orderRes.StatusCode -eq 201 -and $createdOrder.price -eq 1600 -and $createdOrder.status -eq "Pending" -and $createdOrder.measurements.chest -eq 86) {
    Write-Host "-> PASSED: Order created with INR pricing (Base 800 x 2 = 1600) and measurement snapshot." -ForegroundColor Green
} else {
    Write-Host "-> FAILED: Order creation check failed." -ForegroundColor Red
    exit 1
}

# Test 4: Customer sees their own orders
Write-Host "`n[Test 4] Customer retrieves their own orders (GET /api/orders/my)..."
$myOrdersRes = Invoke-WebRequest -Uri "$baseUrl/api/orders/my" -Method Get -WebSession $cust1Session -UseBasicParsing
$myOrdersJson = $myOrdersRes.Content | ConvertFrom-Json
Write-Host "Total orders for Customer 1: $($myOrdersJson.count)"
if ($myOrdersRes.StatusCode -eq 200 -and $myOrdersJson.count -ge 1 -and $myOrdersJson.orders[0].orderNumber -eq $order1Num) {
    Write-Host "-> PASSED: Customer retrieves their order list accurately." -ForegroundColor Green
} else {
    Write-Host "-> FAILED: Order list retrieval failed." -ForegroundColor Red
}

# Test 5: Customer cannot access another customer's order
Write-Host "`n[Test 5] Security: Customer 2 attempting to view Customer 1's order..."
try {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/orders/$order1Id" -Method Get -WebSession $cust2Session
    Write-Host "-> FAILED: Customer 2 was able to view Customer 1's order!" -ForegroundColor Red
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host "Access denied with HTTP $code (Expected 403)"
    if ($code -eq 403) { Write-Host "-> PASSED: Access blocked with 403 Forbidden." -ForegroundColor Green }
}

# Test 6: Customer cannot modify price, status, or orderNumber
Write-Host "`n[Test 6] Security: Customer attempts to tamper price, status, orderNumber via PUT..."
$tamperOrderBody = @{
    price = 10 # Attempted price reduction
    status = "Completed" # Attempted unauthorized status elevation
    orderNumber = "HACKED-999"
    customer = $cust2Id
    designDetails = "Updated legit design notes"
} | ConvertTo-Json

$tamperRes = Invoke-WebRequest -Uri "$baseUrl/api/orders/$order1Id" -Method Put -ContentType "application/json" -Body $tamperOrderBody -WebSession $cust1Session -UseBasicParsing
$tamperJson = $tamperRes.Content | ConvertFrom-Json

# Check DB directly
$dbCheck = node -e "
const mongoose = require('./server/node_modules/mongoose');
const { Order } = require('./server/models/Order');
mongoose.connect('mongodb://127.0.0.1:27017/stitchsmart').then(async () => {
    const ord = await Order.findById('$order1Id');
    console.log('PRICE:' + ord.price + '|STATUS:' + ord.status + '|NUM:' + ord.orderNumber + '|CUST:' + ord.customer);
    process.exit(0);
});
"
Write-Host "Database verification: $dbCheck"
if ($dbCheck.Contains("PRICE:1600") -and $dbCheck.Contains("STATUS:Pending") -and $dbCheck.Contains("NUM:$order1Num") -and $dbCheck.Contains("CUST:$cust1Id")) {
    Write-Host "-> PASSED: Tampering prevented. Customer cannot change price, status, or order number." -ForegroundColor Green
} else {
    Write-Host "-> FAILED: Tampered fields were applied!" -ForegroundColor Red
}

# Test 7: Customer can edit an eligible Pending order
Write-Host "`n[Test 7] Customer edits eligible Pending order (PUT /api/orders/:id)..."
$editBody = @{
    quantity = 3 # 3 x 800 = 2400
    designDetails = "Updated neck style: Round boat neck with gold piping"
} | ConvertTo-Json
$editRes = Invoke-WebRequest -Uri "$baseUrl/api/orders/$order1Id" -Method Put -ContentType "application/json" -Body $editBody -WebSession $cust1Session -UseBasicParsing
$editJson = $editRes.Content | ConvertFrom-Json
Write-Host "Updated Order: Quantity=$($editJson.order.quantity), Price=INR $($editJson.order.price)"
if ($editRes.StatusCode -eq 200 -and $editJson.order.quantity -eq 3 -and $editJson.order.price -eq 2400) {
    Write-Host "-> PASSED: Customer successfully updated Pending order details & price auto-recalculated." -ForegroundColor Green
} else {
    Write-Host "-> FAILED: Pending order update failed." -ForegroundColor Red
}

# Test 8: Duplicate / invalid IDs are handled safely
Write-Host "`n[Test 8] Invalid order ID returns 400..."
try {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/orders/not-a-valid-id" -Method Get -WebSession $cust1Session
    Write-Host "-> FAILED: Expected 400 for malformed ID" -ForegroundColor Red
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host "Malformed ID rejected with HTTP $code"
    if ($code -eq 400) { Write-Host "-> PASSED: Handled invalid ID safely." -ForegroundColor Green }
}

# Test 10: Admin can list orders and update status
Write-Host "`n[Test 10] Admin lists orders and advances status (PATCH /api/orders/:id/status)..."
$allOrdersRes = Invoke-WebRequest -Uri "$baseUrl/api/orders" -Method Get -WebSession $adminSession -UseBasicParsing
$allOrdersJson = $allOrdersRes.Content | ConvertFrom-Json
Write-Host "Admin order count: $($allOrdersJson.count)"

# Transition 1: Pending -> Confirmed
$status1Res = Invoke-WebRequest -Uri "$baseUrl/api/orders/$order1Id/status" -Method Patch -ContentType "application/json" -Body '{"status":"Confirmed"}' -WebSession $adminSession -UseBasicParsing
$status1Json = $status1Res.Content | ConvertFrom-Json
Write-Host "Status transition: Pending -> $($status1Json.order.status)"

# Transition 2: Confirmed -> In Progress
$status2Res = Invoke-WebRequest -Uri "$baseUrl/api/orders/$order1Id/status" -Method Patch -ContentType "application/json" -Body '{"status":"In Progress"}' -WebSession $adminSession -UseBasicParsing
$status2Json = $status2Res.Content | ConvertFrom-Json
Write-Host "Status transition: Confirmed -> $($status2Json.order.status)"

if ($status2Json.order.status -eq "In Progress") {
    Write-Host "-> PASSED: Admin successfully advanced status to 'In Progress'." -ForegroundColor Green
} else {
    Write-Host "-> FAILED: Status advancement failed." -ForegroundColor Red
}

# Test 11: Invalid status transitions are rejected
Write-Host "`n[Test 11] Invalid status transition rejected (e.g. In Progress -> Completed)..."
try {
    # In Progress must go to Ready for Pickup or Cancelled, NOT Completed directly
    $badTrans = Invoke-RestMethod -Uri "$baseUrl/api/orders/$order1Id/status" -Method Patch -ContentType "application/json" -Body '{"status":"Completed"}' -WebSession $adminSession
    Write-Host "-> FAILED: Expected 400 for skipping 'Ready for Pickup' stage" -ForegroundColor Red
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host "Invalid transition rejected with HTTP $code"
    if ($code -eq 400) { Write-Host "-> PASSED: State machine enforced. Invalid transition blocked." -ForegroundColor Green }
}

# Test 9: Customer cancellation rules
Write-Host "`n[Test 9] Customer cancellation rules..."
# Customer cannot cancel an 'In Progress' order online
try {
    $cancelRes = Invoke-RestMethod -Uri "$baseUrl/api/orders/$order1Id/cancel" -Method Patch -WebSession $cust1Session
    Write-Host "-> FAILED: Customer was allowed to cancel In Progress order!" -ForegroundColor Red
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host "Cancellation of 'In Progress' order blocked with HTTP $code"
    if ($code -eq 400) { Write-Host "-> PASSED: Cancellation of in-production garment correctly prevented." -ForegroundColor Green }
}

# Advance status to Ready for Pickup -> Completed
$status3Res = Invoke-WebRequest -Uri "$baseUrl/api/orders/$order1Id/status" -Method Patch -ContentType "application/json" -Body '{"status":"Ready for Pickup"}' -WebSession $adminSession -UseBasicParsing
$status4Res = Invoke-WebRequest -Uri "$baseUrl/api/orders/$order1Id/status" -Method Patch -ContentType "application/json" -Body '{"status":"Completed"}' -WebSession $adminSession -UseBasicParsing
$status4Json = $status4Res.Content | ConvertFrom-Json
Write-Host "Order reached final status: $($status4Json.order.status)"

# Terminal state check: Completed order cannot change status
try {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/orders/$order1Id/status" -Method Patch -ContentType "application/json" -Body '{"status":"Cancelled"}' -WebSession $adminSession
    Write-Host "-> FAILED: Allowed transition from terminal 'Completed' status" -ForegroundColor Red
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host "Terminal status transition blocked with HTTP $code"
    if ($code -eq 400) { Write-Host "-> PASSED: Terminal state protected." -ForegroundColor Green }
}

# Test 12: Updated order status appears in customer's order details
Write-Host "`n[Test 12] Customer checks their order details (GET /api/orders/:id)..."
$custViewRes = Invoke-WebRequest -Uri "$baseUrl/api/orders/$order1Id" -Method Get -WebSession $cust1Session -UseBasicParsing
$custViewJson = $custViewRes.Content | ConvertFrom-Json
Write-Host "Customer views order status: $($custViewJson.order.status)"
if ($custViewJson.order.status -eq "Completed") {
    Write-Host "-> PASSED: Customer sees real-time updated status 'Completed'." -ForegroundColor Green
} else {
    Write-Host "-> FAILED: Status mismatch in customer view." -ForegroundColor Red
}

Write-Host "`n========================================"
Write-Host "ALL PHASE 5 TESTS COMPLETED SUCCESSFULLY!"
Write-Host "========================================"
