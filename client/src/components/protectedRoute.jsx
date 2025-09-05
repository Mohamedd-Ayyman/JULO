// Update ProtectedRoute.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import getLoggedUser from "../apiCalls/users";

const ProtectedRoute = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  const getUserData = async () => {
    try {
      const response = await getLoggedUser();
      if (response.success) {
        setUser(response.data);
      } else {
        navigate("/login");
      }
    } catch (error) {
      navigate("/login");
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      if (localStorage.getItem("token")) {
        await getUserData();
      } else {
        navigate("/login");
      }
    };

    fetchUser();
  }, []);

  return (
    <div>
      <p>Hello {user?.firstname}</p>
      {children}
    </div>
  );
};

export default ProtectedRoute;
