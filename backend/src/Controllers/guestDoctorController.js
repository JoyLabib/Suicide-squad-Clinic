const guestDoctorModel = require('../Models/GuestDoctor.js');
const { default: mongoose } = require('mongoose');
const { isEmailUnique, isUsernameUnique } = require('../utils.js');
const upload = require('../Routes/multer-config');

// Task 3 : register Doctor
const registerGuestDoctor = async (req, res) => {

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', true);

    const {
        Username,
        Name,
        Email,
        Password,
        DateOfBirth,
        HourlyRate,
        Affiliation,
        EDB,
        Speciality,
        Schedule
    } = req.body;

    console.log(req.files);

    try {

        if (!req.files || !req.files['IDDocument'] || !req.files['MedicalDegreeDocument'] || !req.files['WorkingLicenseDocument']) {
            return res.status(400).json('Missing file(s)');
        }

        if (!(await isUsernameUnique(Username))) {
            return res.status(400).json('Username is already taken.');
        }

        if (!(await isEmailUnique(Email))) {
            return res.status(400).json('Email is already in use.');
        }

        if (!Username ||
            !Name ||
            !Email ||
            !Password ||
            !DateOfBirth ||
            !HourlyRate ||
            !Affiliation ||
            !EDB ||
            !Speciality) {
            return res.status(400).json('All fields must be filled.');
        }

        const guestDoctor = new guestDoctorModel({
            Username,
            Name,
            Email,
            Password,
            DateOfBirth,
            HourlyRate,
            Affiliation,
            EDB,
            Speciality,
            Schedule,
            IDDocument: req.files['IDDocument'][0].path,
            MedicalDegreeDocument: req.files['MedicalDegreeDocument'][0].path,
            WorkingLicenseDocument: req.files['WorkingLicenseDocument'][0].path
        });

        await guestDoctor.save();
        res.status(200).json({ guestDoctor })
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

module.exports = registerGuestDoctor;