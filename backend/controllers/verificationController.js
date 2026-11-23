const mongoose = require("mongoose");
const streamifier = require("streamifier");
const cloudinary = require("../config/cloudinary");
const User = require("../models/User");
const handleError = require("../utils/handleError");
const { notify } = require("../utils/notify");

const ID_TYPES = ["aadhaar", "pan", "voter", "driving", "passport", "other"];
const DOCUMENT_LINK_TTL_SECONDS = 10 * 60;

// ID photos are uploaded as "private": they have no public URL at all.
const uploadPrivate = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "women_skill_platform/verification", type: "private", resource_type: "image" },
      (error, result) => (result ? resolve(result) : reject(error)),
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });

// Best effort: a failed delete must not block the decision.
const destroyPrivate = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { type: "private", resource_type: "image" });
  } catch (error) {
    console.error("Could not delete ID document:", error.message);
  }
};

// The provider's own view of her verification (no document location).
const statusView = (user) => ({
  isVerified: user.isVerified,
  status: user.verification?.status || "unverified",
  idType: user.verification?.idType,
  submittedAt: user.verification?.submittedAt,
  reviewedAt: user.verification?.reviewedAt,
  note: user.verification?.note,
});

const getMyVerification = async (req, res) => {
  res.status(200).json({ success: true, verification: statusView(req.user) });
};

const submitVerification = async (req, res) => {
  try {
    const { idType } = req.body;

    if (!ID_TYPES.includes(idType)) {
      return res.status(400).json({ success: false, message: "Choose which ID you are uploading" });
    }

    if (req.body.consent !== "true") {
      return res.status(400).json({
        success: false,
        message: "Please agree that the team may look at your ID to verify you",
      });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Upload a clear photo of your ID" });
    }

    const user = await User.findById(req.user.id);

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: "Your profile is already verified" });
    }

    const previous = user.verification?.document?.public_id;
    const result = await uploadPrivate(req.file.buffer);

    user.verification = {
      status: "pending",
      idType,
      document: { public_id: result.public_id, format: result.format },
      submittedAt: new Date(),
    };
    await user.save();

    // A re-upload replaces the earlier photo.
    if (previous && previous !== result.public_id) await destroyPrivate(previous);

    res.status(200).json({
      success: true,
      message: "Thanks! Your ID was sent for review. This usually takes a day or two.",
      verification: statusView(user),
    });
  } catch (error) {
    handleError(res, error);
  }
};

const listVerifications = async (req, res) => {
  try {
    const status = ["pending", "verified", "rejected"].includes(req.query.status)
      ? req.query.status
      : "pending";

    const providers = await User.find({ role: "provider", "verification.status": status })
      .select("name email phone city area skill photo isVerified verification createdAt")
      .populate("verification.reviewedBy", "name")
      .sort({ "verification.submittedAt": status === "pending" ? 1 : -1 })
      .lean();

    const counts = {};
    for (const key of ["pending", "verified", "rejected"]) {
      counts[key] = await User.countDocuments({ role: "provider", "verification.status": key });
    }

    // Replace the document location with a simple yes/no.
    const safe = providers.map((provider) => {
      const { document, ...rest } = provider.verification || {};
      return { ...provider, verification: { ...rest, hasDocument: Boolean(document?.public_id) } };
    });

    res.status(200).json({ success: true, status, counts, providers: safe });
  } catch (error) {
    handleError(res, error);
  }
};

// A link to the private ID photo that stops working after 10 minutes.
const getDocumentLink = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Provider not found" });
    }

    const user = await User.findById(req.params.id).select("verification role");
    const document = user?.verification?.document;

    if (!user || user.role !== "provider" || !document?.public_id) {
      return res.status(404).json({ success: false, message: "No ID document on file" });
    }

    const expiresAt = Math.floor(Date.now() / 1000) + DOCUMENT_LINK_TTL_SECONDS;
    const url = cloudinary.utils.private_download_url(document.public_id, document.format || "jpg", {
      resource_type: "image",
      type: "private",
      expires_at: expiresAt,
      attachment: false,
    });

    res.status(200).json({ success: true, url, expiresAt: new Date(expiresAt * 1000) });
  } catch (error) {
    handleError(res, error);
  }
};

const decideVerification = async (req, res) => {
  try {
    const { decision } = req.body;
    const note = String(req.body.note || "").trim().slice(0, 300);

    if (!["approve", "reject"].includes(decision)) {
      return res.status(400).json({ success: false, message: "Decision must be approve or reject" });
    }

    if (decision === "reject" && !note) {
      return res.status(400).json({
        success: false,
        message: "Tell the provider why, so she can fix it and try again",
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Provider not found" });
    }

    const user = await User.findById(req.params.id);

    if (!user || user.role !== "provider") {
      return res.status(404).json({ success: false, message: "Provider not found" });
    }

    if (user.verification?.status !== "pending") {
      return res.status(400).json({ success: false, message: "This request is not waiting for review" });
    }

    const documentId = user.verification.document?.public_id;
    const approved = decision === "approve";

    user.isVerified = approved;
    user.verification.status = approved ? "verified" : "rejected";
    user.verification.reviewedAt = new Date();
    user.verification.reviewedBy = req.user._id;
    user.verification.note = approved ? undefined : note;
    // The ID photo is only needed for the review; do not keep it afterwards.
    user.verification.document = undefined;
    await user.save();

    await destroyPrivate(documentId);

    // Tell her the outcome. Email problems must not undo the decision.
    // Bell + email. The ID-check result is important, so it is emailed even if
    // she turned off booking emails.
    notify({
      to: user,
      type: approved ? "verification_approved" : "verification_rejected",
      title: approved ? "Your Women Skill profile is verified" : "About your Women Skill ID check",
      body: approved
        ? "Good news: your ID was checked and customers now see the ✓ Verified badge next to your name."
        : `We could not verify your ID this time. Reason: ${note}. You can upload a new photo from the Verification page.`,
      link: "/provider/verification",
      forceEmail: true,
    });

    res.status(200).json({
      success: true,
      message: approved ? "Provider verified" : "Verification rejected",
    });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
  ID_TYPES,
  getMyVerification,
  submitVerification,
  listVerifications,
  getDocumentLink,
  decideVerification,
};
