import { axiosInstance } from "./index";

const getLoggedUser = async () => {
  try {
    const response = await axiosInstance.get("/api/user/get-logged-in");
    return response.data;
  } catch (error) {
    return error;
  }
};

export default getLoggedUser; 
