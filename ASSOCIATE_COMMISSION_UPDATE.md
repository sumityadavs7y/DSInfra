# Associate Commission Calculation Update

## 📋 Summary

Updated the associate (broker) commission calculation to include a PLC-based commission component.

## 🔢 New Formula

**Previous Formula:**
```
Associate Commission = (Rate - Associate Rate) × Area
```

**New Formula:**
```
Effective Rate = Rate - Discount
Base Commission = (Effective Rate - Associate Rate) × Area
PLC Commission = (Effective Rate × Area) × (Associate PLC Commission % / 100)
Total Commission = Base Commission + PLC Commission
```

## 📊 Example Calculation

**Input:**
- Area: 1000 sq.ft.
- Rate: ₹500 per sq.ft.
- Associate Rate: ₹450 per sq.ft.
- Discount: ₹50
- **Associate PLC Commission: 5%** (NEW)

**Calculation:**
```
Effective Rate = 500 - 50 = ₹450
Base Commission = (450 - 450) × 1000 = ₹0
PLC Commission = (450 × 1000) × (5/100) = ₹22,500
Total Commission = 0 + 22,500 = ₹22,500
```

**Note:** In this example, base commission is 0 because effective rate equals associate rate. 
If associate rate was ₹400, then:
```
Base Commission = (450 - 400) × 1000 = ₹50,000
PLC Commission = (450 × 1000) × (5/100) = ₹22,500
Total Commission = 50,000 + 22,500 = ₹72,500
```

## 🔧 Changes Made

### 1. Database Schema
- **New Field:** `associatePlcCommission` (DECIMAL 10,2)
- **Default Value:** 0
- **Description:** Percentage for PLC-based commission

### 2. Files Updated

#### Models
- ✅ `models/Booking.js` - Added new field definition

#### Views
- ✅ `views/booking/create.ejs` - Added input field and updated calculation
- ✅ `views/booking/edit.ejs` - Added input field and updated calculation
- ✅ `views/booking/view.ejs` - Display field if value > 0

#### Routes
- ✅ `routes/booking.js` - Updated create and edit routes

#### Migrations
- ✅ `migrations/20240101000008-add-associate-plc-commission.js` - New migration

## 🚀 Deployment Steps

### 1. Run the Migration

```bash
# Check migration status
npm run migrate:check

# Run the migration
npm run migrate:run
```

This will add the `associatePlcCommission` column to the `bookings` table.

### 2. Restart the Application

```bash
npm run dev     # Development
# or
npm start       # Production
```

### 3. Verify

- Create a new booking with associate details
- Enter an "Associate PLC Commission %" value
- Verify the commission is calculated correctly

## 📝 Form Fields

### Booking Create/Edit Form

**New Field Added:**
- **Label:** Associate PLC Commission (%)
- **Type:** Number (0-100)
- **Default:** 0
- **Description:** Additional PLC-based commission percentage

**Commission Display:**
- **Label:** Total Associate Commission (₹)
- **Type:** Read-only (auto-calculated)
- **Formula:** [(Effective Rate - Associate Rate) × Area] + [PLC% of (Effective Rate × Area)]

## 🧪 Testing Checklist

- [ ] Run migration successfully
- [ ] Create new booking with associate
- [ ] Enter associate PLC commission percentage
- [ ] Verify total commission calculation
- [ ] Edit existing booking
- [ ] Check commission recalculates correctly
- [ ] View booking details page
- [ ] Verify all fields display correctly

## 🔄 Backward Compatibility

- ✅ Existing bookings will have `associatePlcCommission = 0`
- ✅ Commission calculation remains the same for old bookings
- ✅ Field is optional (nullable with default 0)
- ✅ View page only shows field if value > 0

## 💡 Usage Tips

1. **When to use Associate PLC Commission:**
   - When associate's commission includes a percentage of property value
   - For tiered commission structures
   - When incentivizing higher-value sales

2. **Typical Values:**
   - 0% - No PLC commission (default)
   - 2-5% - Standard PLC commission
   - 10%+ - Premium commission structure

3. **Calculation Breakdown:**
   - Base commission is still based on rate difference
   - PLC commission is percentage of effective property value
   - Both components add up for total commission

## 📞 Support

If you encounter any issues:
1. Check migration ran successfully: `npm run migrate:check`
2. Verify database has new column: Check `bookings` table
3. Check browser console for JavaScript errors
4. Restart the application

---

**Migration Status:** ⏳ Pending (run `npm run migrate:run`)

**Version:** 1.0.0

**Date:** December 2024

