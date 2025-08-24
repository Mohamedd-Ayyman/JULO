import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import Chat from "../models/chat.js";
import Message from "../models/message.js";

const router = express.Router();

router.post("/new-message", authMiddleware, async (req, res) => {
  try {
    //save the new message to db

    const newMessage = new Message(req.body);
    const savedMessage = await newMessage.save();

    //update last message

    // const currentChat = Chat.findById(req.body.chatId);
    // currentChat.lastMessage = savedMessage._id;
    // await currentChat.save();

    const currentChat = await Chat.findByIdAndUpdate(
      req.body.chatId,
      {
        lastMessage: savedMessage._id,
        $inc: { unreadMessageCount: 1 },
      },
      { new: true }
    );

    res.status(201).send({
      message: "message sent successfully",
      success: true,
      data: savedMessage,
    });
  } catch (error) {
    res.status(400).send({
      message: error.message,
      success: false,
    });
  }
});

router.get("/retrieve-chat/:chatId", authMiddleware, async (req, res) => {
  try {
    const retrievedChat = await Message.find({
      chatId: req.params.chatId,
    }).sort({ createdAt: 1 });
    res.status(200).send({
      message: "chat retrieved successfully",
      success: true,
      data: retrievedChat,
    });
  } catch (error) {
    res.status(400).send({
      message: error.message,
      success: false,
    });
  }
});

export default router;
