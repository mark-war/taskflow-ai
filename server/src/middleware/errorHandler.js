const errorHandler = (err, req, res, next) => {
  console.error("[Error]", err.message);
  if (process.env.NODE_ENV === "development") console.error(err.stack);

  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res
      .status(400)
      .json({ error: "Validation failed", details: messages });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ error: `${field} already exists` });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ error: "Invalid ID format" });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export default errorHandler;
