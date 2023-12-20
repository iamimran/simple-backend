const asyncHandler = (requestHandler) => {
  return (req, resp, next) => {
    Promise.resolve(requestHandler(req, resp, next)).catch((error) =>
      next(error)
    );
  };
};

export { asyncHandler };
// const asyncHandler = (func) => async (req, resp, next) => {
//   try {
//     await func(req, resp, next);
//   } catch (error) {
//     resp.status(err.code || 500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
