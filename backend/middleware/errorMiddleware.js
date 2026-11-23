const multer = require("multer");
const handleError = require("../utils/handleError");

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Upload problems (file too large, too many files, wrong type) are the client's fault.
  if (err instanceof multer.MulterError || err?.message === "Only image files are allowed") {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  // Malformed JSON body.
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON body",
    });
  }

  return handleError(res, err);
};

module.exports = errorHandler;
