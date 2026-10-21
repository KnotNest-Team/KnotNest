export const notFound = (req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  let status = err.status || 500;
  let message = err.message || 'Server error';
  let details = err.details;

  if (err.name === 'ValidationError') {
    status = 400; message = 'Validation failed';
    details = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
  } else if (err.name === 'CastError') { status = 400; message = `Invalid ${err.path}`; }
  else if (err.code === 11000) {
    status = 409; const f = Object.keys(err.keyValue || {})[0] || 'field';
    message = `That ${f} is already in use`;
  } else if (err.name === 'MulterError') { status = 400; message = err.message; }

  if (status >= 500) console.error(err);
  res.status(status).json({ message, details, ...(process.env.NODE_ENV === 'development' && status >= 500 ? { stack: err.stack } : {}) });
};
