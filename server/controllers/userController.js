import User from "../models/user.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import express from "express";
const router = express.Router();

// Get data of current logged in user
router.get("/get-logged-in", authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user.userId });
    res.send({
      message: "User fetched successfully",
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(400).send({ message: error.message, success: false });
  }
});
router.get("/get-all-users", authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const otherUsers = await User.find(
      { _id: { $ne: currentUserId } },
      { password: 0 }
    );

    res.send({
      message: "all users fetched successfully",
      success: true,
      data: otherUsers,
    });
  } catch (error) {
    res.status(400).send({ message: error.message, success: false });
  }
});

export default router;
