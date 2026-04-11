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

  return res.status(500).json({
    message: err.message || 'Internal server error',
  });
};

module.exports = errorHandler;
