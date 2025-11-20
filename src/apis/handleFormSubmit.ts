import axios from "axios";
interface FormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  email: string;
  phone: string;
  address: string;
  grade: string;
  previousSchool: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  relationship: string;
  subjects: string[];
  hobbies: string;
  goals: string;
  password: string
}

const handleFormSubmit = async(datas: FormData) => {
    try{

        const response = await axios.post(`${import.meta.env.VITE_APP_B2P_AUTH_APIS}/create-student-user`, {
            datas
        });
        return {status: true, statusCode: response.status}



    }catch(error){
        if (axios.isAxiosError(error)) {
            // axios error: get HTTP status code from response
            return {status: false, statusCode: error.response?.status}

        } else if (error instanceof Error) {
           alert(error.message);
            
        } else {
            alert(String(error));
        }

    }
};



export {handleFormSubmit};