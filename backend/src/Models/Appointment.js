const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const validator = require('validator');

const appointmentSchema = new Schema({    
    Date:{
        type: Date,
        required: true
    },
    DoctorUsername:{
        type: String,
        ref: 'Doctor'
    },
    PatientUsername:{
        type: String,
        ref: 'Patient'
    },
    Status: {
        type: String,
        default:"Upcoming",
        enum: ["Upcoming", "upcoming", "Completed", "completed", "Canceled", "canceled", "Rescheduled", "rescheduled"]
    },
    PaymentMethod: {
      type: String,
      default: "Wallet",
      enum: ["wallet","Wallet","Credit Card","credit card"]
    },
    PaymentStatus: {
      type: String,
      default: "Unpaid",
      enum: ["paid","unpaid","Unpaid","Paid"]
    },
    Price:{
      type: Number,
      required: true
    }
},{ timestamps: true })

appointmentSchema.statics.register = async function (
    Date,
    DoctorUsername,
    PatientUsername,
    Status,
    Price
  ) {

    // validation 
    if (!Date ||
      !PatientUsername ||
      !DoctorUsername ||
      !Price ) { 
    throw Error('All fields must be filled.');
}
    const appointment = await this.create({
      Date,
      DoctorUsername,
      PatientUsername,
      Status,
      Price
    });
  
    return appointment;
  };
  const Appointment = mongoose.model('Appointment', appointmentSchema);
  module.exports = Appointment;