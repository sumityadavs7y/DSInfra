# Letterhead Specifications for PDF Documents

## 📄 Overview

All PDF exports (Booking Slips and Payment Receipts) are now designed to be compatible with pre-printed letterhead paper. The PDFs reserve space at the top and bottom for your company's letterhead design.

---

## 📐 Page Specifications

### **Paper Size:** A4 (595 × 842 points / 210 × 297 mm)

### **Reserved Spaces:**

```
┌─────────────────────────────────────────────┐
│                                             │ ← 0pt (top of page)
│   ╔═══════════════════════════════════╗   │
│   ║  LETTERHEAD HEADER SPACE          ║   │
│   ║  100 points (35mm / 1.4 inches)   ║   │
│   ║                                   ║   │
│   ╚═══════════════════════════════════╝   │ ← 100pt
│                                             │
│   ┌───────────────────────────────────┐   │
│   │  DOCUMENT CONTENT AREA (COMPACT)  │   │
│   │                                   │   │
│   │  • Booking/Receipt Details        │   │
│   │  • Customer Information           │   │
│   │  • Payment Details                │   │
│   │  • Signatures                     │   │
│   │                                   │   │
│   └───────────────────────────────────┘   │
│                                             │ ← 782pt
│   ╔═══════════════════════════════════╗   │
│   ║  LETTERHEAD FOOTER SPACE          ║   │
│   ║  60 points (21mm / 0.83 inches)   ║   │
│   ╚═══════════════════════════════════╝   │
│                                             │ ← 842pt (bottom)
└─────────────────────────────────────────────┘
```

---

## 🎨 Letterhead Design Specifications

### **Header Space (Top 100 points)**

**Recommended Content:**
- Company Logo (left or center)
- Company Name (large, prominent)
- Tagline/Slogan
- Contact Information (Phone, Email, Website)

**Dimensions:**
- **Height:** 100 points (35mm / 1.4 inches)
- **Width:** Full page width (595 points / 210mm)
- **Safe Area:** Keep important content within 50pt margins from sides

**Example Layout:**
```
┌─────────────────────────────────────────────────┐
│  [LOGO]     YOUR COMPANY NAME LTD.             │
│             Real Estate Solutions              │
│                                                 │
│  123 Main Street, City - 123456                │
│  Phone: +91 98765 43210 | www.company.com      │
└─────────────────────────────────────────────────┘
```

### **Footer Space (Bottom 60 points)**

**Recommended Content:**
- Company Registration Details
- GST No., CIN, etc.
- Terms & Conditions Note
- Jurisdiction info

**Dimensions:**
- **Height:** 60 points (21mm / 0.83 inches)
- **Width:** Full page width (595 points / 210mm)
- **Safe Area:** Keep important content within 50pt margins from sides

**Example Layout:**
```
┌─────────────────────────────────────────────────┐
│  Regd. Office: Address Line | CIN: U12345AB... │
│  GST: 22AAAAA0000A1Z5 | Email: info@company.com│
│  Subject to [City] Jurisdiction Only            │
└─────────────────────────────────────────────────┘
```

---

## 📋 Content Area

### **Available Space for Document Content:**
- **Start Y Position:** 100pt from top
- **End Y Position:** 782pt from top (60pt from bottom)
- **Total Height:** 682 points (240mm / 9.5 inches)
- **Side Margins:** 50 points each (left & right)
- **Content:** Compact layout with smaller fonts to fit on one page

### **Content Includes:**
1. Document Title (Booking Slip / Payment Receipt)
2. Document Number & Date
3. Customer/Applicant Details
4. Property/Booking Details
5. Payment Information
6. Terms & Conditions (if applicable)
7. Signature Spaces

---

## 🖨️ Printing Instructions

### **Option 1: Pre-Printed Letterhead**
1. Design and print your letterhead on blank paper
2. Load the pre-printed letterhead into your printer
3. Export PDF from the system
4. Print the PDF on the letterhead paper
5. Header and footer will align with pre-printed design

### **Option 2: Digital Letterhead**
1. Create header and footer as PDF templates
2. Use PDF editing software to merge:
   - Letterhead template (background layer)
   - Exported document (content layer)
3. The reserved spaces will align perfectly

### **Option 3: Blank Paper (Temporary)**
- PDFs can be printed on blank paper
- Header and footer spaces will be blank
- Content remains properly positioned

---

## 🎯 Design Recommendations

### **Header Design Tips:**
1. **Logo Size:** 60-80pt height, position at 40-50pt from top
2. **Company Name:** 18-24pt font size, bold
3. **Colors:** Use brand colors, but ensure good contrast
4. **Alignment:** Center-aligned for formal look, left-aligned for modern
5. **White Space:** Keep 10-15pt padding from edges

### **Footer Design Tips:**
1. **Font Size:** 8-9pt for footer text
2. **Colors:** Gray or muted colors for secondary information
3. **Layout:** Center-aligned or two-column layout
4. **Line Separator:** Thin line (0.5pt) at top of footer looks professional
5. **Legal Text:** Keep font readable (minimum 7pt)

### **Typography:**
- **Professional Fonts:** Arial, Helvetica, Times New Roman
- **Modern Fonts:** Montserrat, Open Sans, Roboto
- **Traditional Fonts:** Georgia, Garamond, Baskerville

### **Color Scheme:**
- Primary: Company brand color (header)
- Secondary: Neutral gray (#555555) for secondary info
- Accent: Use sparingly for important elements
- Background: White or very light color (max 5% gray)

---

## 📝 Technical Specifications

### **PDF Settings Used:**
```javascript
{
    size: 'A4',
    margins: {
        top: 100,      // Header space (compact)
        bottom: 60,    // Footer space (compact)
        left: 50,      // Side margin
        right: 50      // Side margin
    }
}
```

### **Coordinate System:**
- Origin (0,0) is at **top-left** corner
- X increases rightward
- Y increases downward
- Units are in **points** (1 point = 1/72 inch = 0.35mm)

### **Page Dimensions:**
- A4 Page: 595 × 842 points
- Content Width: 495 points (595 - 50 - 50)
- Content Height: 642 points (842 - 120 - 80)

---

## 🛠️ Creating Your Letterhead

### **Method 1: Using Design Software**

1. **Adobe Illustrator / Photoshop:**
   - Create A4 document (210 × 297 mm)
   - Header area: 210 × 42 mm (top)
   - Footer area: 210 × 28 mm (bottom)
   - Export as PDF or print on paper

2. **Microsoft Word:**
   - Page Size: A4
   - Insert Header (3 cm height)
   - Insert Footer (2 cm height)
   - Design and print

3. **Canva / Online Tools:**
   - Select A4 template
   - Add header section (42mm)
   - Add footer section (28mm)
   - Download and print

### **Method 2: Professional Printing**

1. Send specifications to printing company
2. Provide logo and text content
3. Request sample proof before bulk printing
4. Print on quality paper (minimum 80 GSM)

---

## 📊 Space Breakdown

| Section | Start | End | Height | Purpose |
|---------|-------|-----|--------|---------|
| Header Space | 0pt | 100pt | 100pt | Company branding |
| Content Area | 100pt | 782pt | 682pt | Document content (compact) |
| Footer Space | 782pt | 842pt | 60pt | Legal/contact info |

---

## ✅ Quality Checklist

Before finalizing your letterhead design:

- [ ] Logo is clear and properly sized
- [ ] Company name is prominent and readable
- [ ] Contact information is accurate
- [ ] All text is within safe margins (50pt from edges)
- [ ] Colors are professional and print-friendly
- [ ] Footer text is legible (minimum 7-8pt)
- [ ] No content overlaps with document area
- [ ] Test print on actual paper
- [ ] Verify alignment with exported PDFs
- [ ] Check readability when printed in black & white

---

## 🎨 Sample Letterhead Templates

### **Template 1: Centered Header**
```
    ┌─────────────────────────────────────┐
    │          [COMPANY LOGO]             │
    │      REAL ESTATE SOLUTIONS LTD.     │
    │  Excellence in Property Development │
    │                                     │
    │  Address • Phone • Email • Website  │
    └─────────────────────────────────────┘
```

### **Template 2: Left-Aligned Modern**
```
    ┌─────────────────────────────────────┐
    │ [LOGO] COMPANY NAME                 │
    │        Modern Tagline               │
    │                                     │
    │ 📍 Address                          │
    │ ☎ Phone    ✉ Email    🌐 Website   │
    └─────────────────────────────────────┘
```

### **Template 3: Two-Column**
```
    ┌─────────────────────────────────────┐
    │ [LOGO]              COMPANY NAME    │
    │ Address Line 1      Phone: 123456   │
    │ City - 123456       Email: info@... │
    │                     www.company.com │
    └─────────────────────────────────────┘
```

---

## 📞 Support

For questions about letterhead design or PDF formatting:
- Check code comments in `routes/booking.js` and `routes/payment.js`
- Refer to PDFKit documentation for custom modifications
- Test with sample PDFs before bulk printing

---

## 🔄 Updates & Modifications

If you need to adjust the spacing:

1. Edit the margin values in the code:
   ```javascript
   margins: {
       top: 120,     // Adjust header space
       bottom: 80,   // Adjust footer space
       left: 50,
       right: 50
   }
   ```

2. Update this documentation accordingly
3. Inform your printing vendor of new specifications
4. Re-test with sample prints

---

**Last Updated:** December 2024  
**Version:** 1.0.0

