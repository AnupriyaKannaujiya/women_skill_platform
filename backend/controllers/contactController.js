const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const ContactMessage = require("../models/ContactMessage");
const handleError = require("../utils/handleError");

// Links the message to the sender when a valid token is present; never required.
const optionalUserId = (req) => {
  const header = req.header("Authorization") || "";
  if (!header.startsWith("Bearer ")) return undefined;
  try {
    return jwt.verify(header.slice(7), process.env.JWT_SECRET).id;
  } catch {
    return undefined;
  }
};

const createMessage = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    await ContactMessage.create({
      name,
      email: email || undefined,
      message,
      user: optionalUserId(req),
    });

    res.status(201).json({
      success: true,
      message: "Thanks! Your message has reached the Women Skill team.",
    });
  } catch (error) {
    handleError(res, error);
  }
};

const getMessages = async (req, res) => {
  try {
    const messages = await ContactMessage.find()
      .populate("user", "name role")
      .sort({ createdAt: -1 })
      .limit(500);

    const unread = await ContactMessage.countDocuments({ isRead: false });

    res.status(200).json({
      success: true,
      total: messages.length,
      unread,
      messages,
    });
  } catch (error) {
    handleError(res, error);
  }
};

const setMessageRead = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    const message = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { isRead: req.body.isRead !== false },
      { returnDocument: "after" },
    );

    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    res.status(200).json({ success: true, message: "Message updated", data: message });
  } catch (error) {
    handleError(res, error);
  }
};

const deleteMessage = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    const message = await ContactMessage.findByIdAndDelete(req.params.id);

    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    res.status(200).json({ success: true, message: "Message deleted" });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = { createMessage, getMessages, setMessageRead, deleteMessage };
