const express = require('express');
const router = express.Router();
const { Employee, Attendance, EmployeeSalary, EmployeeDocument, User } = require('../models');
const { isAuthenticated } = require('../middleware/auth');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Employee List
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const { search, department, status, showDeleted } = req.query;
        const whereClause = {};

        if (showDeleted !== 'true') {
            whereClause.isDeleted = false;
        }

        if (search) {
            whereClause[Op.or] = [
                { employeeNo: { [Op.like]: `%${search}%` } },
                { firstName: { [Op.like]: `%${search}%` } },
                { lastName: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } },
                { phone: { [Op.like]: `%${search}%` } }
            ];
        }

        if (department) {
            whereClause.department = department;
        }

        if (status) {
            whereClause.status = status;
        }

        const employees = await Employee.findAll({
            where: whereClause,
            include: [{ model: User, as: 'creator', attributes: ['name'] }],
            order: [['createdAt', 'DESC']]
        });

        // Get unique departments for filter
        const departments = await Employee.findAll({
            attributes: ['department'],
            group: ['department'],
            where: { isDeleted: false }
        });

        res.render('employee/list', {
            employees,
            departments: departments.map(d => d.department),
            search: search || '',
            department: department || '',
            status: status || '',
            showDeleted: showDeleted === 'true',
            user: req.session
        });
    } catch (error) {
        console.error('Error listing employees:', error);
        res.status(500).send('Error loading employees');
    }
});

// Create Employee Form
router.get('/create', isAuthenticated, async (req, res) => {
    try {
        // Get unique departments for the dropdown
        const departmentsData = await Employee.findAll({
            attributes: ['department'],
            group: ['department'],
            where: { isDeleted: false }
        });

        res.render('employee/create', {
            user: req.session,
            departments: departmentsData.map(d => d.department) || [],
            errors: []
        });
    } catch (error) {
        console.error('Error loading create form:', error);
        res.render('employee/create', {
            user: req.session,
            departments: [],
            errors: []
        });
    }
});

// Create Employee
router.post('/create', isAuthenticated, async (req, res) => {
    try {
        // Sanitize date and enum fields - convert empty strings to null
        const sanitizedData = {
            ...req.body,
            dateOfBirth: req.body.dateOfBirth && req.body.dateOfBirth.trim() !== '' ? req.body.dateOfBirth : null,
            joiningDate: req.body.joiningDate && req.body.joiningDate.trim() !== '' ? req.body.joiningDate : null,
            gender: req.body.gender && req.body.gender.trim() !== '' ? req.body.gender : null,
            createdBy: req.session.userId
        };

        const employee = await Employee.create(sanitizedData);

        res.redirect(`/employee/${employee.id}`);
    } catch (error) {
        console.error('Error creating employee:', error);
        
        // Get departments for re-rendering the form
        const departmentsData = await Employee.findAll({
            attributes: ['department'],
            group: ['department'],
            where: { isDeleted: false }
        });
        
        res.render('employee/create', {
            user: req.session,
            departments: departmentsData.map(d => d.department),
            errors: [error.message],
            employee: req.body
        });
    }
});

// View Employee Details
router.get('/:id', isAuthenticated, async (req, res) => {
    try {
        const employee = await Employee.findByPk(req.params.id, {
            include: [
                { model: User, as: 'creator', attributes: ['name'] },
                { model: EmployeeDocument, as: 'documents', where: { isDeleted: false }, required: false }
            ]
        });

        if (!employee) {
            return res.status(404).send('Employee not found');
        }

        // Get recent attendance (last 30 days) with auto-present generation
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const attendanceRecords = await Attendance.findAll({
            where: {
                employeeId: employee.id,
                date: { [Op.gte]: thirtyDaysAgo }
            },
            order: [['date', 'DESC']]
        });

        // Create a map of existing attendance records
        const attendanceMap = {};
        attendanceRecords.forEach(record => {
            const dateKey = new Date(record.date).toISOString().split('T')[0];
            attendanceMap[dateKey] = record;
        });

        // Generate full attendance including auto-present for unmarked days (till today only)
        const recentAttendance = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const joiningDate = employee.joiningDate ? new Date(employee.joiningDate) : thirtyDaysAgo;
        const startDate = joiningDate > thirtyDaysAgo ? joiningDate : thirtyDaysAgo;

        // Generate attendance for each day from startDate to today
        for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
            const dateKey = d.toISOString().split('T')[0];
            
            if (attendanceMap[dateKey]) {
                // Use existing record
                recentAttendance.push(attendanceMap[dateKey]);
            } else {
                // Auto-mark as present (virtual record, not in DB)
                recentAttendance.push({
                    date: new Date(d),
                    status: 'Present',
                    checkIn: null,
                    checkOut: null,
                    workingHours: 8,
                    isAutoMarked: true
                });
            }
        }

        // Sort by date descending and limit to 30 most recent
        recentAttendance.sort((a, b) => new Date(b.date) - new Date(a.date));
        const limitedAttendance = recentAttendance.slice(0, 30);

        // Get recent salaries
        const recentSalaries = await EmployeeSalary.findAll({
            where: { employeeId: employee.id },
            order: [['year', 'DESC'], ['month', 'DESC']],
            limit: 6
        });

        res.render('employee/view', {
            employee,
            recentAttendance: limitedAttendance,
            recentSalaries,
            user: req.session
        });
    } catch (error) {
        console.error('Error viewing employee:', error);
        res.status(500).send('Error loading employee details');
    }
});

// Edit Employee Form
router.get('/:id/edit', isAuthenticated, async (req, res) => {
    try {
        const employee = await Employee.findByPk(req.params.id);
        
        if (!employee) {
            return res.status(404).send('Employee not found');
        }

        // Get unique departments for the dropdown
        const departmentsData = await Employee.findAll({
            attributes: ['department'],
            group: ['department'],
            where: { isDeleted: false }
        });

        res.render('employee/edit', {
            employee,
            departments: departmentsData.map(d => d.department) || [],
            user: req.session,
            errors: []
        });
    } catch (error) {
        console.error('Error loading employee:', error);
        res.status(500).send('Error loading employee');
    }
});

// Update Employee
router.post('/:id/edit', isAuthenticated, async (req, res) => {
    try {
        const employee = await Employee.findByPk(req.params.id);
        
        if (!employee) {
            return res.status(404).send('Employee not found');
        }

        // Sanitize date and enum fields - convert empty strings to null
        const sanitizedData = {
            ...req.body,
            dateOfBirth: req.body.dateOfBirth && req.body.dateOfBirth.trim() !== '' ? req.body.dateOfBirth : null,
            joiningDate: req.body.joiningDate && req.body.joiningDate.trim() !== '' ? req.body.joiningDate : null,
            exitDate: req.body.exitDate && req.body.exitDate.trim() !== '' ? req.body.exitDate : null,
            gender: req.body.gender && req.body.gender.trim() !== '' ? req.body.gender : null
        };

        await employee.update(sanitizedData);
        res.redirect(`/employee/${employee.id}`);
    } catch (error) {
        console.error('Error updating employee:', error);
        const employee = await Employee.findByPk(req.params.id);
        
        // Get departments for re-rendering the form
        const departmentsData = await Employee.findAll({
            attributes: ['department'],
            group: ['department'],
            where: { isDeleted: false }
        });
        
        res.render('employee/edit', {
            employee: { ...employee.toJSON(), ...req.body },
            departments: departmentsData.map(d => d.department) || [],
            user: req.session,
            errors: [error.message]
        });
    }
});

// Delete Employee (cascade delete all related data)
router.post('/:id/delete', isAuthenticated, async (req, res) => {
    try {
        const employee = await Employee.findByPk(req.params.id);
        
        if (!employee) {
            return res.status(404).send('Employee not found');
        }

        // Delete all related attendance records
        await Attendance.destroy({
            where: { employeeId: employee.id }
        });

        // Delete all related salary records
        await EmployeeSalary.destroy({
            where: { employeeId: employee.id }
        });

        // Delete all related documents (soft delete)
        await EmployeeDocument.update(
            { isDeleted: true },
            { where: { employeeId: employee.id } }
        );

        // Soft delete the employee
        await employee.update({ isDeleted: true });
        
        res.redirect('/employee');
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).send('Error deleting employee');
    }
});

// Restore Employee
router.post('/:id/restore', isAuthenticated, async (req, res) => {
    try {
        const employee = await Employee.findByPk(req.params.id);
        
        if (!employee) {
            return res.status(404).send('Employee not found');
        }

        await employee.update({ isDeleted: false });
        res.redirect(`/employee/${employee.id}`);
    } catch (error) {
        console.error('Error restoring employee:', error);
        res.status(500).send('Error restoring employee');
    }
});

// ==================== ATTENDANCE MANAGEMENT ====================

// View Attendance for Employee
router.get('/:id/attendance', isAuthenticated, async (req, res) => {
    try {
        const employee = await Employee.findByPk(req.params.id);
        if (!employee) {
            return res.status(404).send('Employee not found');
        }

        const { month, year } = req.query;
        const currentDate = new Date();
        const selectedMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
        const selectedYear = year ? parseInt(year) : currentDate.getFullYear();

        // Get attendance records for selected month
        const attendance = await Attendance.findAll({
            where: {
                employeeId: employee.id,
                date: {
                    [Op.gte]: new Date(selectedYear, selectedMonth - 1, 1),
                    [Op.lt]: new Date(selectedYear, selectedMonth, 1)
                }
            },
            order: [['date', 'ASC']]
        });

        // Create a map of existing attendance records
        const attendanceMap = {};
        attendance.forEach(record => {
            const dateKey = new Date(record.date).toISOString().split('T')[0];
            attendanceMap[dateKey] = record;
        });

        // Generate full month calendar with auto-present for unmarked days (till today only)
        const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
        const fullAttendance = [];
        const joiningDate = employee.joiningDate ? new Date(employee.joiningDate) : null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(selectedYear, selectedMonth - 1, day);
            const dateKey = date.toISOString().split('T')[0];
            
            // Skip if date is in future
            if (date > today) continue;
            
            // Skip if before joining date
            if (joiningDate && date < joiningDate) continue;
            
            if (attendanceMap[dateKey]) {
                // Use existing record
                fullAttendance.push(attendanceMap[dateKey]);
            } else {
                // Auto-mark as present (virtual record, not in DB)
                fullAttendance.push({
                    date: date,
                    status: 'Present',
                    checkIn: null,
                    checkOut: null,
                    workingHours: 8,
                    isAutoMarked: true
                });
            }
        }

        res.render('employee/attendance', {
            employee,
            attendance: fullAttendance,
            selectedMonth,
            selectedYear,
            user: req.session
        });
    } catch (error) {
        console.error('Error loading attendance:', error);
        res.status(500).send('Error loading attendance');
    }
});

// Mark Attendance
router.post('/:id/attendance/mark', isAuthenticated, async (req, res) => {
    try {
        const { date, status, checkIn, checkOut, leaveType, workingHours, remarks } = req.body;
        
        await Attendance.upsert({
            employeeId: req.params.id,
            date,
            status,
            checkIn: checkIn || null,
            checkOut: checkOut || null,
            leaveType: leaveType || null,
            workingHours: workingHours || 0,
            remarks,
            markedBy: req.session.userId
        });

        res.redirect(`/employee/${req.params.id}/attendance`);
    } catch (error) {
        console.error('Error marking attendance:', error);
        res.status(500).send('Error marking attendance');
    }
});

// ==================== SALARY MANAGEMENT ====================

// View Salary Records
router.get('/:id/salary', isAuthenticated, async (req, res) => {
    try {
        const employee = await Employee.findByPk(req.params.id);
        if (!employee) {
            return res.status(404).send('Employee not found');
        }

        const salaries = await EmployeeSalary.findAll({
            where: { employeeId: employee.id },
            include: [{ model: User, as: 'processor', attributes: ['name'] }],
            order: [['year', 'DESC'], ['month', 'DESC']]
        });

        res.render('employee/salary', {
            employee,
            salaries,
            user: req.session
        });
    } catch (error) {
        console.error('Error loading salaries:', error);
        res.status(500).send('Error loading salaries');
    }
});

// Process Salary Form
router.get('/:id/salary/process', isAuthenticated, async (req, res) => {
    try {
        const employee = await Employee.findByPk(req.params.id);
        if (!employee) {
            return res.status(404).send('Employee not found');
        }

        const { month, year } = req.query;
        const currentDate = new Date();
        const selectedMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
        const selectedYear = year ? parseInt(year) : currentDate.getFullYear();

        // Check if salary already exists
        const existingSalary = await EmployeeSalary.findOne({
            where: {
                employeeId: employee.id,
                month: selectedMonth,
                year: selectedYear
            }
        });

        // Calculate attendance for the month
        const attendance = await Attendance.findAll({
            where: {
                employeeId: employee.id,
                date: {
                    [Op.gte]: new Date(selectedYear, selectedMonth - 1, 1),
                    [Op.lt]: new Date(selectedYear, selectedMonth, 1)
                }
            }
        });

        const presentDays = attendance.filter(a => ['Present', 'Half-Day'].includes(a.status)).length;
        const absentDays = attendance.filter(a => a.status === 'Absent').length;

        res.render('employee/process-salary', {
            employee,
            existingSalary,
            selectedMonth,
            selectedYear,
            presentDays,
            absentDays,
            user: req.session,
            errors: []
        });
    } catch (error) {
        console.error('Error loading salary form:', error);
        res.status(500).send('Error loading salary form');
    }
});

// Process Salary
router.post('/:id/salary/process', isAuthenticated, async (req, res) => {
    try {
        const employee = await Employee.findByPk(req.params.id);
        if (!employee) {
            return res.status(404).send('Employee not found');
        }

        const {
            month, year, basicSalary, hra, transportAllowance, mealAllowance, otherAllowances,
            providentFund, professionalTax, tds, loanDeduction, otherDeductions,
            overtimePay, bonus, presentDays, absentDays, paidDays,
            paymentStatus, paymentMode, paymentDate, transactionReference, remarks
        } = req.body;

        // Calculate totals
        const totalAllowances = parseFloat(hra || 0) + parseFloat(transportAllowance || 0) + 
                                parseFloat(mealAllowance || 0) + parseFloat(otherAllowances || 0);
        
        const totalDeductions = parseFloat(providentFund || 0) + parseFloat(professionalTax || 0) + 
                                parseFloat(tds || 0) + parseFloat(loanDeduction || 0) + parseFloat(otherDeductions || 0);
        
        const grossSalary = parseFloat(basicSalary) + totalAllowances + parseFloat(overtimePay || 0) + parseFloat(bonus || 0);
        const netSalary = grossSalary - totalDeductions;

        await EmployeeSalary.upsert({
            employeeId: employee.id,
            month,
            year,
            basicSalary,
            hra: hra || 0,
            transportAllowance: transportAllowance || 0,
            mealAllowance: mealAllowance || 0,
            otherAllowances: otherAllowances || 0,
            totalAllowances,
            providentFund: providentFund || 0,
            professionalTax: professionalTax || 0,
            tds: tds || 0,
            loanDeduction: loanDeduction || 0,
            otherDeductions: otherDeductions || 0,
            totalDeductions,
            overtimePay: overtimePay || 0,
            bonus: bonus || 0,
            grossSalary,
            netSalary,
            presentDays: presentDays || 0,
            absentDays: absentDays || 0,
            paidDays: paidDays || 0,
            paymentDate: paymentDate || null,
            paymentStatus,
            paymentMode: paymentMode || null,
            transactionReference: transactionReference || null,
            remarks,
            processedBy: req.session.userId
        });

        res.redirect(`/employee/${employee.id}/salary`);
    } catch (error) {
        console.error('Error processing salary:', error);
        res.status(500).send('Error processing salary');
    }
});

// Edit Salary Form
router.get('/:id/salary/:salaryId/edit', isAuthenticated, async (req, res) => {
    try {
        const employee = await Employee.findByPk(req.params.id);
        if (!employee) {
            return res.status(404).send('Employee not found');
        }

        const salary = await EmployeeSalary.findByPk(req.params.salaryId);
        if (!salary) {
            return res.status(404).send('Salary record not found');
        }

        // Get attendance for the salary month
        const attendance = await Attendance.findAll({
            where: {
                employeeId: employee.id,
                date: {
                    [Op.gte]: new Date(salary.year, salary.month - 1, 1),
                    [Op.lt]: new Date(salary.year, salary.month, 1)
                }
            }
        });

        const presentDays = attendance.filter(a => ['Present', 'Half-Day'].includes(a.status)).length;
        const absentDays = attendance.filter(a => a.status === 'Absent').length;

        res.render('employee/edit-salary', {
            employee,
            salary,
            presentDays,
            absentDays,
            user: req.session,
            errors: []
        });
    } catch (error) {
        console.error('Error loading salary edit form:', error);
        res.status(500).send('Error loading salary edit form');
    }
});

// Update Salary
router.post('/:id/salary/:salaryId/edit', isAuthenticated, async (req, res) => {
    try {
        const employee = await Employee.findByPk(req.params.id);
        if (!employee) {
            return res.status(404).send('Employee not found');
        }

        const salary = await EmployeeSalary.findByPk(req.params.salaryId);
        if (!salary) {
            return res.status(404).send('Salary record not found');
        }

        const {
            basicSalary, hra, transportAllowance, mealAllowance, otherAllowances,
            providentFund, professionalTax, tds, loanDeduction, otherDeductions,
            overtimePay, bonus, presentDays, absentDays, paidDays,
            paymentStatus, paymentMode, paymentDate, transactionReference, remarks
        } = req.body;

        // Calculate totals
        const totalAllowances = parseFloat(hra || 0) + parseFloat(transportAllowance || 0) + 
                                parseFloat(mealAllowance || 0) + parseFloat(otherAllowances || 0);
        
        const totalDeductions = parseFloat(providentFund || 0) + parseFloat(professionalTax || 0) + 
                                parseFloat(tds || 0) + parseFloat(loanDeduction || 0) + parseFloat(otherDeductions || 0);
        
        const grossSalary = parseFloat(basicSalary) + totalAllowances + parseFloat(overtimePay || 0) + parseFloat(bonus || 0);
        const netSalary = grossSalary - totalDeductions;

        await salary.update({
            basicSalary,
            hra: hra || 0,
            transportAllowance: transportAllowance || 0,
            mealAllowance: mealAllowance || 0,
            otherAllowances: otherAllowances || 0,
            totalAllowances,
            providentFund: providentFund || 0,
            professionalTax: professionalTax || 0,
            tds: tds || 0,
            loanDeduction: loanDeduction || 0,
            otherDeductions: otherDeductions || 0,
            totalDeductions,
            overtimePay: overtimePay || 0,
            bonus: bonus || 0,
            grossSalary,
            netSalary,
            presentDays: presentDays || 0,
            absentDays: absentDays || 0,
            paidDays: paidDays || 0,
            paymentDate: paymentDate || null,
            paymentStatus,
            paymentMode: paymentMode || null,
            transactionReference: transactionReference || null,
            remarks,
            processedBy: req.session.userId
        });

        res.redirect(`/employee/${employee.id}/salary`);
    } catch (error) {
        console.error('Error updating salary:', error);
        res.status(500).send('Error updating salary');
    }
});

// ==================== DOCUMENT MANAGEMENT ====================

// Configure multer for document uploads
const storage = multer.diskStorage({
    destination: async function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/employee-documents');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'EMP-' + req.params.id + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images, PDFs, and Office documents are allowed!'));
        }
    }
});

// View Documents
router.get('/:id/documents', isAuthenticated, async (req, res) => {
    try {
        const employee = await Employee.findByPk(req.params.id);
        if (!employee) {
            return res.status(404).send('Employee not found');
        }

        const documents = await EmployeeDocument.findAll({
            where: { employeeId: employee.id, isDeleted: false },
            include: [{ model: User, as: 'uploader', attributes: ['name'] }],
            order: [['uploadDate', 'DESC']]
        });

        res.render('employee/documents', {
            employee,
            documents,
            user: req.session,
            errors: []
        });
    } catch (error) {
        console.error('Error loading documents:', error);
        res.status(500).send('Error loading documents');
    }
});

// Upload Document
router.post('/:id/documents/upload', isAuthenticated, upload.single('document'), async (req, res) => {
    try {
        const employee = await Employee.findByPk(req.params.id);
        if (!employee) {
            return res.status(404).send('Employee not found');
        }

        if (!req.file) {
            return res.status(400).send('No file uploaded');
        }

        const { documentType, documentNumber, documentName, expiryDate, remarks } = req.body;

        await EmployeeDocument.create({
            employeeId: employee.id,
            documentType: documentType || 'Other',
            documentNumber: documentNumber || null,
            documentName: documentName || req.file.originalname,
            filePath: req.file.path,
            fileSize: req.file.size,
            uploadDate: new Date(),
            expiryDate: expiryDate || null,
            remarks: remarks || null,
            uploadedBy: req.session.userId
        });

        res.redirect(`/employee/${employee.id}/documents`);
    } catch (error) {
        console.error('Error uploading document:', error);
        res.status(500).send('Error uploading document: ' + error.message);
    }
});

// Download Document
router.get('/:id/documents/:docId/download', isAuthenticated, async (req, res) => {
    try {
        const document = await EmployeeDocument.findByPk(req.params.docId);
        
        if (!document || document.isDeleted) {
            return res.status(404).send('Document not found');
        }

        res.download(document.filePath, document.documentName);
    } catch (error) {
        console.error('Error downloading document:', error);
        res.status(500).send('Error downloading document');
    }
});

// Delete Document
router.post('/:id/documents/:docId/delete', isAuthenticated, async (req, res) => {
    try {
        const document = await EmployeeDocument.findByPk(req.params.docId);
        
        if (!document) {
            return res.status(404).send('Document not found');
        }

        await document.update({ isDeleted: true });
        res.redirect(`/employee/${req.params.id}/documents`);
    } catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).send('Error deleting document');
    }
});

module.exports = router;

