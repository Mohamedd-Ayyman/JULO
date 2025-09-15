import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import getLoggedUser from "../apiCalls/users";
import { useDispatch } from "react-redux";
import { hideLoader, showLoader } from "../redux/loaderSlice";
import { setUser } from "../redux/usersSlice";

const ProtectedRoute = ({ children }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const getUserData = async () => {
    try {
      dispatch(showLoader());
      const response = await getLoggedUser();
      dispatch(hideLoader());
      if (response.success) {
        dispatch(setUser(response.data));
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

  return <div>{children}</div>;
};

export default ProtectedRoute;
