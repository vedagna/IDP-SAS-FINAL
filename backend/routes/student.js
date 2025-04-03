const express = require('express');
const Student = require('../models/student');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Certificate = require('../models/Certificate'); 
const router = express.Router();

router.get('/details/:email', async (req, res) => {
    try {
        const { email } = req.params;
        if (!email) return res.status(400).json({ message: 'Email is required' });

        const student = await Student.findOne({ email });
        if (!student) return res.status(404).json({ message: 'Student not found' });

        res.json(student);
    } catch (error) {
        console.error('Error fetching student details:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.put('/update-details', async (req, res) => {
    try {
      const { email, name, phone, branch, year, section, studentRegd } = req.body;
  
      const updatedStudent = await Student.findOneAndUpdate(
        { email },
        { name, phone, branch, year, section, studentRegd },
        { new: true }
      );
  
      if (!updatedStudent) {
        return res.status(404).json({ message: 'Student not found' });
      }
  
      res.json(updatedStudent);
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
      cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
  
const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
      if (file.mimetype !== 'application/pdf') {
        return cb(new Error('Only PDF files are allowed!'), false);
      }
      cb(null, true);
    }
});

router.post('/upload-certificate', upload.single('certificate'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
  
      const { name, studentRegd, year, eventName,
        eventDate, phone, category, studentEmail } = req.body;
  
      const student = await Student.findOne({ studentRegd });
      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }
  
      const filePath = req.file.path;
  
      const newCertificate = new Certificate({
        studentId: student._id,
        name,
        studentRegd,
        year,
        eventName,
        eventDate,
        phone,
        category,
        studentEmail,
        fileUrl: `/uploads/${req.file.filename}`,
        filePath: filePath,
      });
  
      await newCertificate.save();
  
      res.json({ message: 'Certificate uploaded successfully!', filePath });
    } catch (error) {
      console.error('Error uploading certificate:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
});

router.get('/faculty/certificates', async (req, res) => {
    try {
      const certificates = await Certificate.find().populate('studentId', 'name studentRegd year phone studentEmail filePath status');
      res.json(certificates);
    } catch (error) {
      console.error('Error fetching certificates:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
});

router.delete('/faculty/reject/:id', async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Deleting certificate with ID: ${id}`);

      const certificate = await Certificate.findById(id);
      if (!certificate) {
        return res.status(404).json({ message: "Certificate not found" });
      }

      // Delete the physical file
      if (certificate.filePath) {
        const absolutePath = path.join(__dirname, '..', certificate.filePath);
        if (fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath);
        }
      }

      // Delete from database
      await Certificate.findByIdAndDelete(id);

      res.json({ message: "Certificate deleted successfully" });
    } catch (error) {
      console.error("Error deleting certificate:", error);
      res.status(500).json({ message: "Error deleting certificate", error: error.message });
    }
});

router.get('/certificates/regd/:studentRegd', async (req, res) => {
    try {
      const { studentRegd } = req.params;
      const certificates = await Certificate.find({ studentRegd });
  
      if (!certificates.length) {
        return res.status(404).json({ message: 'No certificates found' });
      }
  
      res.json(certificates);
    } catch (error) {
      console.error('Error fetching certificates:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
});

router.get('/certificates/:email', async (req, res) => {
    try {
      const certificates = await Certificate.find({ studentEmail: req.params.email });
  
      if (!certificates) {
        return res.status(404).json({ message: 'No certificates found' });
      }
  
      res.json(certificates);
    } catch (error) {
      console.error('Error fetching certificates:', error);
      res.status(500).json({ message: 'Server error' });
    }
});

router.get('/student/details/:email', async (req, res) => {
    try {
      const student = await Student.findOne({ studentEmail: req.params.email });
  
      if (!student) return res.status(404).json({ message: 'Student not found' });
  
      res.json({
        name: student.name,
        studentRegd: student.studentRegd,
        year: student.year,
        phone: student.phone,
        studentEmail: student.studentEmail
      });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching student details' });
    }
});
router.put('/update-details', async (req, res) => {
  try {
    const { email, name, phone, branch, year, section, studentRegd, studentEmail } = req.body;

    // Update student details
    const updatedStudent = await Student.findOneAndUpdate(
      { email },
      { name, phone, branch, year, section, studentRegd },
      { new: true }
    );

    if (!updatedStudent) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Update corresponding certificates
    await Certificate.updateMany(
      { studentEmail },
      { 
        name,
        phone,
        year,
        studentRegd
      }
    );

    res.json(updatedStudent);
  } catch (error) {
    console.error('Error updating details:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;