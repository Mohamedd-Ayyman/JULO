import express from "express";
import Chat from "../models/chat.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/create-new-chat", authMiddleware, async (req, res) => {
  try {
    const chat = new Chat(req.body);
    const savedChat = await chat.save();

    res.status(201).send({
      message: "Chat created successfully",
      success: true,
      data: savedChat,
    });
  } catch (error) {
    res.status(401).send({ message: error.message, success: false });
  }
});

router.get("/get-all-user-chats", authMiddleware, async (req, res) => {
  try {
    const allChats = await Chat.find({ members: { $in: req.user.userId } });
    res.send({
      message: "Chats retrieved successfully",
      success: true,
      data: allChats,
    });
  } catch (error) {
    res.status(401).send({ message: error.message, success: false });
  }
});

export default router;
