let _io = null;

/**
 * Call this once from server.js after io is created.
 * @param {import("socket.io").Server} io
 */
exports.initIO = (io) => {
  _io = io;
};

/**
 * Access the io instance from anywhere in the app.
 */
exports.getIO = () => _io;