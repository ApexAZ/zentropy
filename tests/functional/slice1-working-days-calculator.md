# Functional Test: Working Days Calculator (Slice 1)

## Test Overview
This document provides step-by-step functional testing procedures for the Working Days Calculator interface. These tests should be executed manually in a browser to verify complete user workflows.

## Prerequisites
- Development server running: `npm run dev`
- Database container running: `docker-compose up -d`
- Browser: Chrome, Firefox, Safari, or Edge (latest versions)
- Test URL: http://localhost:3000/working-days-calculator.html

## Test Environment Setup
1. **Start Services**:
   ```bash
   cd /home/brianhusk/repos/claude-code/zentropy
   docker-compose up -d
   npm run dev
   ```

2. **Verify Server Status**:
   - Health check: http://localhost:3000/health
   - Expected: `{"status":"ok","database":"connected"}`

## Test Scenarios

### **Scenario 1: Page Load and Initial Display**
**Objective**: Verify the page loads correctly with proper styling and default values

**Steps**:
1. Open browser and navigate to: http://localhost:3000/working-days-calculator.html
2. Wait for page to fully load
3. Observe page layout and styling

**Expected Results**:
- [ ] Page loads without errors
- [ ] Title displays: "Working Days Calculator"
- [ ] Clean white container on light gray background
- [ ] Form is centered and properly styled
- [ ] All form elements are visible and aligned
- [ ] CSS styling is applied (blue buttons, proper fonts)
- [ ] Page is responsive (test by resizing browser window)

**Pass/Fail**: [ ]

**Notes**: ________________________

---

### **Scenario 2: Default Form State**
**Objective**: Verify form has correct default values and configuration

**Steps**:
1. Examine all form fields without interacting
2. Check which checkboxes are selected by default
3. Verify placeholder text and help messages

**Expected Results**:
- [ ] Start Date field is empty but ready for input
- [ ] End Date field is empty but ready for input
- [ ] Monday through Friday checkboxes are checked by default
- [ ] Saturday and Sunday checkboxes are unchecked by default
- [ ] Holiday textarea shows placeholder text with examples
- [ ] Help text is visible under each form section
- [ ] Submit button displays "Calculate Working Days"

**Pass/Fail**: [ ]

**Notes**: ________________________

---

### **Scenario 3: Date Input Functionality**
**Objective**: Test date input fields work correctly

**Steps**:
1. Click on Start Date field
2. Enter or select date: 2024-07-01 (July 1, 2024)
3. Click on End Date field  
4. Enter or select date: 2024-07-15 (July 15, 2024)
5. Verify dates are displayed correctly

**Expected Results**:
- [ ] Date picker opens when clicking date fields
- [ ] Can enter dates manually or via date picker
- [ ] Dates display in correct format (YYYY-MM-DD)
- [ ] No errors or validation issues with valid dates
- [ ] Both date fields accept input properly

**Pass/Fail**: [ ]

**Notes**: ________________________

---

### **Scenario 4: Working Days Configuration**
**Objective**: Test working days checkbox functionality

**Steps**:
1. Observe default checked state (Mon-Fri should be checked)
2. Uncheck "Friday" checkbox
3. Check "Saturday" checkbox
4. Uncheck "Monday" checkbox
5. Check "Sunday" checkbox

**Expected Results**:
- [ ] Default state: Monday-Friday checked, Saturday-Sunday unchecked
- [ ] Can successfully uncheck previously checked boxes
- [ ] Can successfully check previously unchecked boxes
- [ ] Visual feedback when checking/unchecking (checkmark appears/disappears)
- [ ] Labels are clickable (clicking label toggles checkbox)
- [ ] No errors when changing working day configuration

**Pass/Fail**: [ ]

**Notes**: ________________________

---

### **Scenario 5: Holiday Input**
**Objective**: Test holiday textarea functionality

**Steps**:
1. Click in the Holidays textarea
2. Enter the following text:
   ```
   2024-07-04
   2024-12-25
   2024-12-31
   ```
3. Test editing (delete a line, add another date)

**Expected Results**:
- [ ] Can click and focus in textarea
- [ ] Can type holiday dates
- [ ] Text wraps properly in textarea
- [ ] Can delete and edit text
- [ ] Placeholder text disappears when typing
- [ ] No character limits or input restrictions

**Pass/Fail**: [ ]

**Notes**: ________________________

---

### **Scenario 6: Form Validation**
**Objective**: Test client-side form validation

**Steps**:
1. Leave all fields empty
2. Click "Calculate Working Days" button
3. Fill in Start Date only
4. Click "Calculate Working Days" button  
5. Fill in End Date as well
6. Uncheck ALL working day checkboxes
7. Click "Calculate Working Days" button

**Expected Results**:
- [ ] Empty form shows validation errors (HTML5 required field validation)
- [ ] Missing End Date shows validation error
- [ ] Form with all required fields filled attempts submission
- [ ] Browser prevents submission of empty required fields
- [ ] Validation messages are clear and helpful

**Pass/Fail**: [ ]

**Notes**: ________________________

---

### **Scenario 7: Form Submission Attempt**
**Objective**: Test form submission behavior (will fail until API is implemented)

**Steps**:
1. Fill in Start Date: 2024-07-01
2. Fill in End Date: 2024-07-15  
3. Keep default working days (Mon-Fri)
4. Add holiday: 2024-07-04
5. Click "Calculate Working Days" button

**Expected Results**:
- [ ] Form submits (page attempts to load)
- [ ] Receives 404 error (API endpoint doesn't exist yet)
- [ ] Error is displayed clearly
- [ ] No JavaScript errors in browser console
- [ ] Form data was properly formatted for submission

**Pass/Fail**: [ ]

**Notes**: ________________________

---

### **Scenario 8: Accessibility Testing**
**Objective**: Verify basic accessibility features

**Steps**:
1. Use Tab key to navigate through all form elements
2. Test keyboard navigation
3. Check for proper labels and associations

**Expected Results**:
- [ ] Can tab through all form elements in logical order
- [ ] Focus indicators are visible (blue outline/highlight)
- [ ] Labels are properly associated with form controls
- [ ] Can use keyboard to interact with checkboxes (spacebar)
- [ ] Form is usable without mouse interaction

**Pass/Fail**: [ ]

**Notes**: ________________________

---

### **Scenario 9: Cross-Browser Compatibility**
**Objective**: Test in different browsers (if available)

**Browsers to Test**: Chrome, Firefox, Safari, Edge

**Steps**:
1. Open same URL in different browsers
2. Test basic functionality in each
3. Look for styling differences

**Expected Results**:
- [ ] Page displays consistently across browsers
- [ ] Date inputs work in all browsers
- [ ] Checkboxes function properly
- [ ] CSS styling is consistent
- [ ] No browser-specific errors

**Pass/Fail**: [ ]

**Browser Notes**: ________________________

---

### **Scenario 10: Mobile Responsiveness**
**Objective**: Test mobile and tablet viewports

**Steps**:
1. Open browser developer tools (F12)
2. Toggle device simulation/responsive mode
3. Test various screen sizes (mobile, tablet, desktop)
4. Check touch interaction on mobile simulation

**Expected Results**:
- [ ] Layout adapts to smaller screens
- [ ] Form remains usable on mobile
- [ ] Text is readable without zooming
- [ ] Touch targets are appropriately sized
- [ ] No horizontal scrolling required

**Pass/Fail**: [ ]

**Notes**: ________________________

---

## Summary

**Total Scenarios**: 10  
**Passed**: ___ / 10  
**Failed**: ___ / 10

**Overall Result**: [ ] PASS / [ ] FAIL

**Critical Issues Found**:
1. ________________________________
2. ________________________________
3. ________________________________

**Minor Issues Found**:
1. ________________________________
2. ________________________________
3. ________________________________

**Recommendations for Next Steps**:
- [ ] Fix any critical issues before proceeding
- [ ] Document any browser-specific quirks
- [ ] Proceed with API endpoint development
- [ ] Create additional test scenarios as needed

---

**Test Executed By**: ________________  
**Date**: ________________  
**Browser(s) Used**: ________________  
**Screen Resolution**: ________________  

## Notes for Future Testing
- This test suite should be executed before each release
- Update scenarios when new features are added
- Consider automating these tests with tools like Playwright or Cypress
- Test on real devices when possible, not just browser simulation