const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const handleError = require("../utils/handleError");

// Latest notifications for the bell, plus how many are unread.
const getNotifications = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);

    const [notifications, unread] = await Promise.all([
      Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(limit).lean(),
      Notification.countDocuments({ user: req.user._id, isRead: false }),
    ]);

    res.status(200).json({ success: true, unread, notifications });
  } catch (error) {
    handleError(res, error);
  }
};

// Cheap call the header polls to update the badge.
const getUnreadCount = async (req, res) => {
  try {
    const unread = await Notification.countDocuments({ user: req.user._id, isRead: false });
    res.status(200).json({ success: true, unread });
  } catch (error) {
    handleError(res, error);
  }
};

const markRead = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    // Scoped to the signed-in user, so nobody can touch another person's notifications.
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true },
      { returnDocument: "after" },
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.status(200).json({ success: true, notification });
  } catch (error) {
    handleError(res, error);
  }
};

const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
    res.status(200).json({ success: true, unread: 0 });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = { getNotifications, getUnreadCount, markRead, markAllRead };
