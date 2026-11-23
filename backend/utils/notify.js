const Notification = require("../models/Notification");
const User = require("../models/User");
const { sendMail } = require("./mailer");

const clientUrl = () =>
  (process.env.CLIENT_URL || "http://localhost:5173").split(",")[0].trim().replace(/\/$/, "");

// Booking times are stored in UTC; people read them in Indian time.
const formatWhen = (date) =>
  new Date(date).toLocaleString("en-IN", {
    timeZone: process.env.APP_TIMEZONE || "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const firstName = (name) => String(name || "").trim().split(/\s+/)[0] || "there";

/**
 * Creates an in-app notification and (unless the person switched it off) sends an email.
 * Never throws: a failed notification must not break the action that caused it.
 *
 * @param {object} options
 * @param {string|object} options.to  user id or a user document
 * @param {string} options.type
 * @param {string} options.title      short line shown in the bell list and as the email subject
 * @param {string} [options.body]     one or two sentences
 * @param {string} [options.link]     in-app path, e.g. /customer/dashboard
 * @param {string} [options.booking]  related booking id
 * @param {boolean} [options.email=true]
 * @param {boolean} [options.forceEmail=false]  send even if she turned emails off (account matters)
 */
const notify = async ({ to, type, title, body, link, booking, email = true, forceEmail = false }) => {
  try {
    // Always re-read the user so the latest email preference is respected.
    const user = await User.findById(to?._id || to).select("name email emailNotifications isBlocked");

    if (!user || user.isBlocked) return;

    await Notification.create({ user: user._id, type, title, body, link, booking });

    if (email && user.email && (forceEmail || user.emailNotifications !== false)) {
      const url = link ? `${clientUrl()}${link}` : clientUrl();
      await sendMail({
        to: user.email,
        subject: title,
        text:
          `Hi ${firstName(user.name)},\n\n${body || title}\n\nOpen Women Skill: ${url}\n\n` +
          "You can turn off these emails from your profile.",
        html:
          `<p>Hi ${firstName(user.name)},</p><p>${body || title}</p>` +
          `<p><a href="${url}">Open Women Skill</a></p>` +
          '<p style="color:#888;font-size:12px">You can turn off these emails from your profile.</p>',
      });
    }
  } catch (error) {
    console.error(`Notification "${type}" failed:`, error.message);
  }
};

module.exports = { notify, formatWhen, firstName };
