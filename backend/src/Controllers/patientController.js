const { default: mongoose } = require("mongoose");
const { isEmailUnique, isUsernameUnique } = require("../utils.js")
const patientSchema = require('../Models/Patient.js');
const doctorSchema = require('../Models/Doctor.js');
const prescriptionSchema = require('../Models/Prescription.js');
const FamilyMember = require('../Models/FamilyMember.js');
const appointmentSchema = require('../Models/Appointment.js');
const HealthPackage = require("../Models/HealthPackage.js");
const Appointment = require("../Models/Appointment.js");
const Payment = require("../Models/Payment.js")

require("dotenv").config();

const stripe = require('stripe')(process.env.STRIPE_KEY);


// Task 1 : register patient
const registerPatient = async (req, res) => {
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials',true);
  
  const {
    Username,
    Name,
    Email,
    Password,
    DateOfBirth,
    Gender,
    MobileNumber,
    EmergencyContactName,
    EmergencyContactMobile,
    FamilyMembers,
    PatientPrescriptions
  } = req.body;
  
  try {
    if (!(await isUsernameUnique(Username))) {
      throw new Error('Username is already taken.');
    }

    if (!(await isEmailUnique(Email))) {
      throw new Error('Email is already in use.');
    }
    
    const customer = await createStripeCustomer({ Email,Name,MobileNumber });

    const patient = await patientSchema.register(
      Username,
      Name,
      Email,
      Password,
      DateOfBirth,
      Gender,
      MobileNumber,
      EmergencyContactName,
      EmergencyContactMobile,
      FamilyMembers,
      PatientPrescriptions,
      customer.id
    );

    await patient.save();
    
    res.status(200).json({patient});
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

//Function for Stripe
async function createStripeCustomer({ Email, Name, Phone }) {
  return new Promise(async (resolve, reject) => {
    try {
      const Customer = await stripe.customers.create({
        name: Name,
        email: Email,
        phone: Phone
      });

      resolve(Customer);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });
}


// Req 18: app.post('/addFamMember/:Username')
const addFamMember = async (req, res) => {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', true);

  const { Username } = req.params;
  const {
    Name,
    NationalID,
    Age,
    Gender,
    RelationToPatient
  } = req.body;
  try {

    const patient = await patientSchema.findOne({ Username: Username });

    if (!patient) {
      return res.status(404).send({ error: 'Patient not found' });
    }

    const newFamilyMember = await FamilyMember.create({
      Name,
      NationalID,
      Age,
      Gender,
      RelationToPatient
    });

    patient.FamilyMembers.push(newFamilyMember.NationalID);
    await patient.save();

    res.status(200).send({ familyMember: newFamilyMember });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};


// Req 22 app.get('/getFamMembers/:Username')

const getFamMembers = async (req, res) => {
  const { Username } = req.params;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', true);

  try {
    const patient = await patientSchema.findOne({ Username: Username });

    if (!patient) {
      return res.status(404).send({ error: 'Patient not found' });
    }

    const familyMembers = patient.FamilyMembers;

    const members = await FamilyMember.find({ NationalID: { $in: familyMembers } });

    if (members.length === 0) {
      return res.status(404).send('No family members linked to this patient');
    }

    const FamMembersInfo = members.map((member) => ({
      Name: member.Name,
      Age: member.Age,
      NationalID: member.NationalID,
      Gender: member.Gender,
      RelationToPatient: member.RelationToPatient,
    }));

    res.status(200).send(FamMembersInfo);

  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

const patientFilterAppsByDate = async (req,res) => {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', true);
  const { Date, Username } = req.params;

    try {
        const user = await patientSchema.findOne({Username: Username});

        if(!user){
          return res.status(404).send('No patient found');
        }
        // Use the filter object to query the appointment collection
        const filteredAppointments = await appointmentSchema.find({PatientUsername: Username, Date: Date});

        if (filteredAppointments.length === 0) {
            return res.status(404).send('No matching appointments found');
        }
        // Send the list of matching appointments as a response
        res.send(filteredAppointments);
    } catch (error) {
        res.status(500).send({error: error.message});
    }
}

const patientFilterAppsByStatus = async (req,res) => {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', true);
  const { Status, Username } = req.params;      

  try {
      const user = await patientSchema.findOne({Username: Username});

        if(!user){
          return res.status(404).send('No patient found');
        }

      // Use the filter object to query the appointment collection
      const filteredAppointments = await appointmentSchema.find({PatientUsername: Username, Status: Status});

      if (filteredAppointments.length === 0) {
          return res.status(404).send('No matching appointments found');
      }

      // Send the list of matching appointments as a response
      res.status(200).send({filteredAppointments});
  } catch (error) {
      res.status(500).send({error: error.message});
  }
}

const allAppointments = async (req,res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', true);

  try{
    const {Username} = req.params;
    const user = await patientSchema.findOne({Username: Username});
    if(!user){  
         return res.status(404).send('No patient found');
    }

      // Use the filter object to query the appointment collection
      const filteredAppointments = await appointmentSchema.find({PatientUsername: Username});

      if (filteredAppointments.length === 0) {
          return res.status(404).send('No matching appointments found');
      }

      // Send the list of matching appointments as a response
      res.status(200).send({filteredAppointments});
  } catch (error) {
    res.status(500).send({error: error.message});
}
}

// Req 37: view a list of all doctors
const viewDoctorsWithSessionPrices = async (req, res) => {
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', true);

  try {
    
    const { Username } = req.params;
    const patient = await patientSchema.findOne({ Username: Username });

    if (!patient) {
      return res.status(404).send({ error: 'Patient not found' });
    }

    const doctors = await doctorSchema.find().exec();

    const result = [];

    for (const doctor of doctors) {
      console.log("sccc",doctor.Schedule)
      const doctorRate = doctor.HourlyRate;

      const clinicMarkup = 0.10; // 10% markup

      let sessionPrice = doctorRate;

      const healthPackage = await HealthPackage.findOne({ PatientsUsernames: Username }).exec();

      if (healthPackage) {
        const discountPercentage = healthPackage.doctorSessionDiscount || 0;

        const discountAmount = (doctorRate * discountPercentage) / 100;

        sessionPrice -= discountAmount;
      }

      sessionPrice += sessionPrice * clinicMarkup;

      result.push({
        Name: doctor.Name,
        Username:doctor.Username,
        Email: doctor.Email,
        Speciality: doctor.Speciality,
        sessionPrice,
        Schedule: doctor.Schedule
      });
    }
    
    res.status(200).json(result);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

// Req 39: Filter for a doctor by name/speciality
const findDocBySpecality = async (req, res) => {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', true);

  //console.log(Speciality)

  const { Username, Speciality} = req.params;
  try {

    const patient = await patientSchema.findOne({Username: Username});

    if(!patient){
      return res.status(404).send("NO patient found");
    }

    //console.log(filter)
    const doctors = await doctorSchema.find({Speciality: Speciality});
    if (doctors.length === 0) {
      return res.status(404).send({ error: 'Doctor is not Found' });
    }
    res.status(200).send(doctors)

  }
  catch (error) {
    res.status(500).json({ error: error.message
     });
  }
};

const findDocByAvailability = async (req, res) => {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', true);

  //console.log(Speciality)
  const {Date, Time} = req.params;
  try {

    // const patient = await patientSchema.findOne({Username: Username});

    // if(!patient){
    //   return res.status(404).send("NO patient found");
    // }

    const doctors = await doctorSchema.find();
    //const result = doctors.flatMap(({Schedule}) => Schedule.map(({Date,Time}) => ({Date,Time})));

    const result = [];
    for (const doc of doctors){
      // const sch = doc.Schedule.map(({Date, From, To})=>({Date, From, To}));
    doc.Schedule.map((e) => {

      if(e.Date.toISOString().substring(0,4)=== Date.substring(0,4) && e.Date.toISOString().substring(5,7) === Date.substring(5,7) && e.Date.toISOString().substring(8,10) === Date.substring(8,10)
      && e.From<=Time && e.To>=Time){
        result.push(doc);
    }
  });

  }

    console.log(result);

    if (result.length === 0) {
      return res.status(404).send({ error: 'Doctor is not Found' });
    }
    res.status(200).send(result)

  }
  catch (error) {
    res.status(500).json({ error: error.message});
    }
};

// Req 38 : app.get('/searchDocByNameAndSpec')
const searchDocByName = async (req, res) => {
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', true);
  
  try {
    const { Name, Username } = req.params

    const patient = await patientSchema.findOne({Username: Username});

    if(!patient){
      return res.status(404).send("NO patient found");
    }

    const doctors = await doctorSchema.find({Name: Name})
    if (doctors.length === 0) {
      return res.status(404).send({ error: 'Doctor is not Found' });
    }
    res.status(200).send(doctors)
  }
  catch (error) {
    res.status(500).json({ error: error.message});
    }
};

const searchDocBySpec = async (req, res) => {
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', true);

  try {
    const { Speciality, Username } = req.params

    const patient = await patientSchema.findOne({Username: Username});

    if(!patient){
      return res.status(404).send("NO patient found");
    }
    
    const doctors = await doctorSchema.find({Speciality: Speciality})
    if (doctors.length === 0) {
      return res.status(404).send({ error: 'Doctor is not Found' });
    }

    res.status(200).send(doctors)
  }
  catch (error) {
    res.status(500).json({ error: error.message});
  }
};

//Req 40+41: Select a doctor from results and view all his info
const viewDoctorInfo = async (req, res) => {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', true);

  const {DoctorUsername, PatientUsername} = req.params;
    
  try{
    const patient = await patientSchema.findOne({Username: PatientUsername});

    if(!patient){
      return res.status(404).send("NO patient found");
    }

    const doctor = await doctorSchema.findOne({Username: DoctorUsername},{_id:0, Password:0, patients:0});

    if(!doctor){
      return res.status(404).send({ error: 'Doctor not found' });
    }

    res.status(200).json(doctor);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

//app.post('/addPresToPatient/:Username/:id')
const addPresToPatient = async (req, res) => {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', true);

  const { Username, id } = req.params;
  try {
    const patient = await patientSchema.findOne({Username: Username});

    if (!patient) {
      return res.status(404).send({ error: 'Patient not found' });
    }

    patient.PatientPrescriptions.push(id);

    await patient.save();

    res.status(200).send({ message: patient});
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};



// Req 54: app.get('/viewMyPres/:Username')
const viewAllMyPres = async (req, res) => {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', true);

  const { Username } = req.params;
  try {
    const patient = await patientSchema.findOne({Username: Username});

    if (!patient) {
      return res.status(404).send({ error: 'Patient not found' });
    }

    const allPrescriptions = patient.PatientPrescriptions;

    if (allPrescriptions.length === 0) {
      return res.status(404).send('No prescriptions found for this patient');
    }

    const prescriptions = await prescriptionSchema.find({ _id: { $in: allPrescriptions } });

    if (prescriptions.length === 0) {
      return res.status(404).send('No prescriptions found for this patient2');
    }

    const result = prescriptions.map(prescription => ({
      prescriptionID: prescription._id,
      Appointment_ID: prescription.Appointment_ID,
      Date: prescription.Date,
      DoctorUsername: prescription.DoctorUsername,
      Description: prescription.Description,
      Filled: prescription.Filled
    }));

    res.status(200).send(result);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};


//app.get('/filterMyPres/:Username')



const filterMyPresBasedOnDate = async (req, res) => {
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', true);
  
  const { Username, Date } = req.params;
  try {
    const patient = await patientSchema.findOne({ Username: Username });

    if (!patient) {
      return res.status(404).send({ error: 'Patient not found' });
    }

    const query = { _id: { $in: patient.PatientPrescriptions },Date: Date };

    const prescriptions = await prescriptionSchema.find(query);

    if (prescriptions.length === 0) {
      return res.status(404).send('No prescriptions found for the specified criteria');
    }

    const result = prescriptions.map((prescription) => ({
      prescriptionID: prescription._id,
      Appointment_ID: prescription.Appointment_ID,
      Date: prescription.Date,
      DoctorUsername: prescription.DoctorUsername,
      Description: prescription.Description,
      Filled: prescription.Filled
    }));

    res.status(200).send(result);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

const filterMyPresBasedOnFilled = async (req, res) => {
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', true);
  
  const { Username, Filled } = req.params;

  try {
    const patient = await patientSchema.findOne({ Username: Username });

    if (!patient) {
      return res.status(404).send({ error: 'Patient not found' });
    }

    const query = { _id: { $in: patient.PatientPrescriptions }, Filled: Filled};

    const prescriptions = await prescriptionSchema.find(query);

    if (prescriptions.length === 0) {
      return res.status(404).send('No prescriptions found for the specified criteria');
    }

    const result = prescriptions.map((prescription) => ({
      prescriptionID: prescription._id,
      Appointment_ID: prescription.Appointment_ID,
      Date: prescription.Date,
      DoctorUsername: prescription.DoctorUsername,
      Description: prescription.Description,
      Filled: prescription.Filled
    }));

    res.status(200).send(result);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

const filterMyPresBasedOnDoctor = async (req, res) => {
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', true);
  
  const { Username, DoctorUsername } = req.params;

  try {
    const patient = await patientSchema.findOne({ Username: Username });

    if (!patient) {
      return res.status(404).send({ error: 'Patient not found' });
    }

    const query = { _id: { $in: patient.PatientPrescriptions }, DoctorUsername: DoctorUsername};

    const prescriptions = await prescriptionSchema.find(query);

    if (prescriptions.length === 0) {
      return res.status(404).send('No prescriptions found for the specified criteria');
    }

    const result = prescriptions.map((prescription) => ({
      prescriptionID: prescription._id,
      Appointment_ID: prescription.Appointment_ID,
      Date: prescription.Date,
      DoctorUsername: prescription.DoctorUsername,
      Description: prescription.Description,
      Filled: prescription.Filled
    }));

    res.status(200).send(result);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

const viewMyPres = async (req,res) => {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', true);

  const { id } = req.params;
  try {
    const prescription = await prescriptionSchema.findById(id);

    if (!prescription) {
      return res.status(404).send({ error: 'Prescription not found' });
    }

    const patient = await patientSchema.findOne({Username: prescription.PatientUsername});

    const doctor = await doctorSchema.findOne({Username: prescription.DoctorUsername});

    const appointment = await Appointment.findOne({_id: prescription.Appointment_ID});

    const result = {
      PatientName: patient.Name,
      PatientUsername: patient.Username,
      DoctorName: doctor.Name,
      Description: prescription.Description,
      Date: prescription.Date,
      Filled: prescription.Filled,
      AppointmentID: prescription.Appointment_ID
    }

    res.status(200).send(result);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

//Req 20: choose payment method of appointment
const choosePaymentMethodForApp = async(req, res) => {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', true);

  const { id } = req.params;
  try{
    
    const app = await Appointment.findById(id);

    if(!app){
      return res.status(404).json({error : "This appointment doesn't exist!"})
  }

  const updatedApp = {
    $set: {
        PaymentMethod: req.body.PaymentMethod
    },
  };

  const updated = await Appointment.findOneAndUpdate({_id: id},updatedApp);
  res.status(200).send(updated);

} catch (error) {
    res.status(400).send({ error: error.message });
  }

};

//Req 29: choose payment method of health package
const choosePaymentMethodForHP = async(req, res) => {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', true);

  const { type,PatientUsername } = req.params;
  try{
    
    const hp = await HealthPackage.findOne({Type: type});

    if(!hp){
      return res.status(404).json({error : "This health package doesn't exist!"})
  }

  const patient = await patientSchema.findOne({Username: PatientUsername});

    if(!patient){
      return res.status(404).json({error : "This patient doesn't exist!"})
  }

  const updatedHP = {
    $set: {
      "SubscribedHP.$[].PaymentMethod": req.body.PaymentMethod
    }
  };

  const updated = await patientSchema.updateOne({Username: PatientUsername, "SubscribedHP.Type": type}, updatedHP);
  res.status(200).send(updated);
  
} catch (error) {
    res.status(400).send({ error: error.message });
  }

};

//Req 67: view Wallet amount
const viewWalletAmountByPatient = async (req, res) => {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', true);

  const {PatientUsername} = req.params;
    
  try{
    const patient = await patientSchema.findOne({Username: PatientUsername});

    if(!patient){
      return res.status(404).send("No patient found");
    }

    res.status(200).json(patient.WalletAmount);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};
 
// Req 30: view subscribed health packages for the patient and family members
const viewSubscribedHealthPackages = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', true);

  const { Username } = req.params;

  try {
    // Find the patient by username
    const patient = await patientSchema.findOne({ Username });

    if (!patient) {
      return res.status(404).send('Patient not found');
    }

    // Get the subscribed health packages for the patient
    const subscribedHP = patient.SubscribedHP;

    // Check if the patient has family members
    if (patient.FamilyMembers.length > 0) {
      // Get the family members' usernames
      const familyMemberName = patient.FamilyMembers;

      for (const familyMemberUsername of familyMemberName) {
        // Find the family member by username
        const familyMember = await FamilyMember.findOne({ Username: familyMemberUsername });

        if (familyMember) {
          // Get the associated PatientUsername from the FamilyMember model
          const patientUsername = familyMember.PatientUsername;

          if (patientUsername) {
            // Find the patient with the associated PatientUsername
            const familyMemberPatient = await patientSchema.findOne({ Username: patientUsername });

            if (familyMemberPatient && familyMemberPatient.SubscribedHP.Type) {
              subscribedHP.push(familyMemberPatient.SubscribedHP);
            }
          }
        }
      }
    }

    // Send the list of subscribed health packages as a response
    res.status(200).json({ subscribedHealthPackages: subscribedHP });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

//req 21 : pay for appointment
const payForAppointment = async(res, req) => {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', true);

  const { appId, paymentMethod } = req.params;

  try {
    
    const app = await Appointment.findOne({_id: appId });

    if (!app) {
      return res.status(404).send({ error: 'Appointment not found' });
    }
    else if(app.PaymentStatus === "paid")
      return res.status(404).send({ error: 'Appointment already paid' });

    const patient = await patientSchema.findOne({Username: app.PatientUsername});

    if(paymentMethod === "Credit Card"){

    const paymentIntent = await stripe.paymentIntents.create({
      amount: app.Price,
      currency: 'egp',
      customer: patient.StripeCustomerId,
      description: "Paying for an appointment"
    });

    await stripe.paymentIntents.confirm(paymentIntent);

    const updatedApp = {
      $set: {
          PaymentStatus: "paid",
          PaymentMethod: "Credit Card"
      },
    };
  
    const updated = await Appointment.updateOne({_id: appId},updatedApp);

    const payment = await Payment.create({
      PatientUsername: app.PatientUsername,
      Amount: app.Price,
      PaidOnDate: new Date(),
      ItemPaidForId: appId,
      TypeOfPurschase: "appointment",
      PaymentMethod: "Credit Card",
      Status: "success"
  });
}
else if(paymentMethod === "Wallet"){

  if(patient.WalletAmount >= app.Price){

    const updatedPat = {
      $set: {
        WalletAmount: (WalletAmount-app.Price),
      },
    };
  
    const update = await patientSchema.updateOne({Username: app.PatientUsername},updatedPat);

    const updatedApp = {
      $set: {
          PaymentStatus: "paid",
          PaymentMethod: "Wallet"
      },
    };
  
    const updated = await Appointment.updateOne({_id: appId},updatedApp);

    const payment = await Payment.create({
      PatientUsername: app.PatientUsername,
      Amount: app.Price,
      PaidOnDate: new Date(),
      ItemPaidForId: appId,
      TypeOfPurschase: "appointment",
      PaymentMethod: "Wallet",
      Status: "success"
  });
  }
  else{

    const updatedApp = {
      $set: {
          PaymentStatus: "unpaid",
          PaymentMethod: "Wallet"
      },
    };
  
    const updated = await Appointment.updateOne({_id: appId},updatedApp);

    const payment = await Payment.create({
      PatientUsername: app.PatientUsername,
      Amount: app.Price,
      PaidOnDate: new Date(),
      ItemPaidForId: appId,
      TypeOfPurschase: "appointment",
      PaymentMethod: "Wallet",
      Status: "failed"
  });

    return res.status(400).send("Not enough money in the wallet!");
  }
  
}
  const updatedDoc = {
    $set: {
      WalletAmount: (WalletAmount+app.Price),
    },
  };

  const update = await doctorSchema.updateOne({Username: app.DoctorUsername},updatedDoc);

    return res.status(200).send(payment);

  } catch (error) {
    res.status(400).send({ error: error.message });
  }

};
// Req 31: View the status of health care package subscription for the patient and family members
const viewHealthCarePackageStatus = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', true);

  const { Username } = req.params;

  try {
    // Find the patient by username
    const patient = await patientSchema.findOne({ Username });

    if (!patient) {
      return res.status(404).send('Patient not found');
    }

    // Get the health care package status for the patient
    const patientSubscription = patient.SubscribedHP;

    const result = {
      Patient: {
        Status: patientSubscription.Status,
        EndDate: null,
      },
      FamilyMembers: [],
    };

    // Check if the patient has family members
    if (patient.FamilyMembers && patient.FamilyMembers.length > 0) {
      // Get the family members' usernames
      const familyMemberUsernames = patient.FamilyMembers;

      for (const familyMemberUsername of familyMemberUsernames) {
        // Find the family member by username
        const familyMember = await FamilyMember.findOne({ Username: familyMemberUsername });

        if (familyMember) {
          // Get the associated PatientUsername from the FamilyMember model
          const patientUsername = familyMember.PatientUsername;

          if (patientUsername) {
            // Find the patient with the associated PatientUsername
            const familyMemberPatient = await patientSchema.findOne({ Username: patientUsername });

            if (familyMemberPatient) {
              const familyMemberSubscription = familyMemberPatient.SubscribedHP;
              if (familyMemberSubscription.Status !== 'Unsubscribed') {
                result.FamilyMembers.push({
                  Name: familyMember.Name,
                  Status: familyMemberSubscription.Status,
                  EndDate: familyMemberSubscription.Status !== 'Unsubscribed' ? familyMemberSubscription.SubscriptionEndDate : null,
                });
              }
            }
          }
        }
      }
    }

    // Set the EndDate for the patient
    if (patientSubscription.Status !== 'Unsubscribed') {
      result.Patient.EndDate = patientSubscription.SubscriptionEndDate;
    }

    // Send the health care package status as a response
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


// Req 32: Cancel a subscription of a health package for the patient and family members
const cancelHealthCarePackageSubscription = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', true);

  const { Username, Type } = req.params;

  try {
    // Find the patient by username
    const patient = await patientSchema.findOne({ Username });

    if (!patient) {
      return res.status(404).send('Patient not found');
    }

    // Check if the patient has a subscription for the specified health package type
    const subscription = patient.SubscribedHP;

    if (subscription && subscription.Type === Type) {
      // Cancel the patient's subscription
      subscription.Status = 'Cancelled';
      subscription.CancellationDate = new Date();

      // Save the updated patient
      await patient.save();
    }

    // Check if the patient has family members
    if (patient.FamilyMembers && patient.FamilyMembers.length > 0) {
      // Get the family members' usernames
      const familyMemberUsernames = patient.FamilyMembers;

      for (const familyMemberUsername of familyMemberUsernames) {
        // Find the family member by username
        const familyMember = await FamilyMember.findOne({ Username: familyMemberUsername });

        if (familyMember) {
          // Get the associated PatientUsername from the FamilyMember model
          const patientUsername = familyMember.PatientUsername;

          if (patientUsername) {
            // Find the patient with the associated PatientUsername
            const familyMemberPatient = await patientSchema.findOne({ Username: patientUsername });

            if (familyMemberPatient) {
              // Check if the family member has a subscription for the specified health package type
              const familyMemberSubscription = familyMemberPatient.SubscribedHP;

              if (familyMemberSubscription && familyMemberSubscription.Type === Type) {
                // Cancel the family member's subscription
                familyMemberSubscription.Status = 'Cancelled';
                familyMemberSubscription.CancellationDate = new Date();
                // Save the updated family member
                await familyMemberPatient.save();
              }
            }
          }
        }
      }
    }

    res.status(200).send('Health package subscription has been cancelled for the patient and family members.');
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};









// Req 27 view health package options and details
const viewHealthPackages = async (req, res) => {
  try {
    const healthPackages = await HealthPackage.find();

    if (healthPackages.length === 0) {
      return res.status(404).send('No health packages found');
    }

  
    const packageInfo = healthPackages.map((package) => ({
      Type: package.Type,
      AnnualFee: package.AnnualFee,
      DoctorSessionDiscount: package.DoctorSessionDiscount,
      MedicineDiscount: package.MedicineDiscount,
      FamilySubscriptionDiscount: package.FamilySubscriptionDiscount,
    }));

    res.status(200).json(packageInfo);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};








module.exports = {
  registerPatient,
  addFamMember,
  getFamMembers,
  searchDocByName,
  searchDocBySpec,
  findDocBySpecality,
  findDocByAvailability,
  viewDoctorsWithSessionPrices,
  viewDoctorInfo,
  addPresToPatient,
  viewMyPres,
  viewAllMyPres,
  filterMyPresBasedOnDate,
  filterMyPresBasedOnDoctor,
  filterMyPresBasedOnFilled,
  patientFilterAppsByDate,
  patientFilterAppsByStatus,
  allAppointments,
  choosePaymentMethodForApp,
  choosePaymentMethodForHP,
  viewWalletAmountByPatient,
  payForAppointment ,
  viewHealthPackages ,
  viewSubscribedHealthPackages ,
  cancelHealthCarePackageSubscription ,
  viewHealthCarePackageStatus
}
 