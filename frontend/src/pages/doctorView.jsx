import { useState, useEffect } from "react";
import NavBarAdministrator from "../components/NavBarAdministrator";
import { useParams} from 'react-router-dom';
import axios from "axios";
import NavBarDoctor from "../components/NavBarDoctor";
import MainBtn from "../components/Button";
import Contract from '../components/Contract'; 

import { useNavigate } from 'react-router-dom';


function DoctorView(){

    const {username} = useParams();
    const[result, setResult] = useState([]);
    const [email, setEmail] = useState('');
    const [hourlyrate, setHourlyRate] = useState(0);
    const [affiliation, setAffiliation] = useState('');
    const [date, setDate] = useState('');
    const [from, setFrom] = useState(0);
    const [to, setTo] = useState(0);
    const [contractInfo, setContractInfo] = useState(null);
    const [showContract, setShowContract] = useState(false);


    let navigate = useNavigate()


    const viewContract = async (DoctorUsername) => {
      try {
        const response = await axios.get(`http://localhost:4000/Doctor/viewContract/${DoctorUsername}`);
        setContractInfo(response.data.contract, () => {
          console.log("Contract info set:", contractInfo);
          setShowContract(true);
        });
      } catch (error) {
        console.error("Failed to fetch contract details:", error);
      }
    };
    
    // const handleViewContract = async () => {
    //   try {
    //     const response = await axios.get(`http://localhost:4000/Doctor/viewContract/${username}`);
    //     setContractInfo(response.data.contract);
    //     setShowContract(true); // This will display the contract component
    //   } catch (error) {
    //     console.error("Failed to fetch contract details:", error);
    //     setShowContract(false); // In case of error, do not show the contract component
    //   }
    // };
    const handleViewContract = () => {
      navigate(`/doctor/${username}/contract`);
    };

    
  const updateEmail=() => {
    const response = axios.put(`http://localhost:4000/Doctor/updateDoctorByEmail/${username}`, {Email:email})
  .then(res =>setResult(res.data)).catch(err => console.log(err))
  console.log(result)
  }
  const updateHourlyRate=() => {
    const response = axios.put(`http://localhost:4000/Doctor/updateDoctorByHourlyRate/${username}`, {HourlyRate:hourlyrate})
  .then(res =>setResult(res.data)).catch(err => console.log(err))
  console.log(result)
  }
  const updateAffiliation=() => {
    const response = axios.put(`http://localhost:4000/Doctor/updateDoctorByAffiliation/${username}`, {Affiliation:affiliation})
  .then(res =>setResult(res.data)).catch(err => console.log(err))
  console.log(result)
  }
  useEffect(() => {
    if (contractInfo) {
      console.log("Contract info set:", contractInfo);
      setShowContract(true);
    }
  }, [contractInfo]); 
  

    return (
        <div>
        <NavBarDoctor username={username}/>
        <div>
            <MainBtn
              txt="View All Patients"
              style="green-btn"
              action={() => navigate(`/patientsList/${username}`)}
              key="navBtn"
            />
          </div>
          <div>
            <MainBtn
              txt="View All Appointments"
              style="green-btn"
              action={() => navigate(`/appointmentsListDoctor/${username}`)}
              key="navBtn"
            />
            </div>
            <div>
            <MainBtn
              txt="View Contract"
              style="green-btn"
              action={handleViewContract}
              key="navBtn"
            />
            </div>
            {showContract && contractInfo && (
              <Contract contract={contractInfo} />
            )}
            
              
  <h3><input  type= 'email'  placeholder= 'Enter New Email'  onChange={(e) => setEmail(e.target.value)} />
  <button onClick={updateEmail}>Update Email</button></h3>
  <h3><input type="number"  placeholder="Enter New Hourly Rate" onChange={(e) => setHourlyRate(e.target.value)}/>
  <button onClick={updateHourlyRate}>Update Hourly Rate</button></h3>
  <h3><input type="text"  placeholder="Enter New Affiliation" onChange={(e) => setAffiliation(e.target.value)}/>
  <button onClick={updateAffiliation}>Update Affiliation</button></h3>
  <form>
    <h3>
      Add Appointment
    </h3>
    <h3>
    <input  type= 'date' required onChange={(e) => setDate(e.target.value)} />
    </h3>
    <h3>
    <input  type= 'number' placeholder="From" required onChange={(e) => setFrom(e.target.value)} />
    </h3>
    <h3>
    <input  type= 'number' placeholder="To" required onChange={(e) => setTo(e.target.value)} />
    </h3>
    <button>Add Appointment</button>
  </form>
          
      
        </div>
    )
    }
    export default DoctorView;