const errorHandler = (err, req, res, next) => {
  console.error(err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation error',
      details: Object.values(err.errors).map((item) => item.message),
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      message: 'Duplicate value error',
      key: err.keyValue,
    });
  }

  // Unhandled/unexpected errors: log the real message and stack server-side
  // only. Echoing err.message straight to the client (the old behavior) can
  // leak internal details - file paths, driver/library error text, query
  // shapes, occasionally credentials embedded in a connection-string error.
  // The client only ever gets a generic message.
  return res.status(500).json({
    message: 'Internal server error',
  });
};

module.exports = errorHandler;
