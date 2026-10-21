export default class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
  static badRequest(m, d) { return new ApiError(400, m, d); }
  static unauthorized(m = 'Not authenticated') { return new ApiError(401, m); }
  static forbidden(m = 'You do not have permission to do this') { return new ApiError(403, m); }
  static notFound(m = 'Not found') { return new ApiError(404, m); }
  static conflict(m) { return new ApiError(409, m); }
}
