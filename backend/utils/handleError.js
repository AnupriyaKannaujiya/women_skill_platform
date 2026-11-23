// Turns an unexpected controller error into a safe JSON response.
// Bad ids / bad values become 400s; anything else is logged and hidden behind a generic 500.
const handleError = (res, error) => {
  if (error?.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: `Invalid value for ${error.path}`,
    });
  }

  if (error?.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: Object.values(error.errors)
        .map((item) => item.message)
        .join(" "),
    });
  }

  if (error?.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Duplicate entry",
    });
  }

  console.error(error);
  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
};

module.exports = handleError;
