import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decodeToken = jwt.verify(token, process.env.SECRET_KEY);
    req.user = decodeToken;
    next();
  } catch (error) {
    res.send({
      message: error.message,
      success: false,
    });
  }
};

export default authMiddleware;
