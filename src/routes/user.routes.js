import { Router } from "express";
import {
  changeCurrentUserPassword,
  getChannelProfile,
  getCurrentUser,
  getWatchHistory,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateUserAvatar,
  updateUserCoverImage,
  updateUserDetails,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const userRouter = Router();

userRouter.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);

userRouter.route("/login").post(loginUser);

//secured routes
userRouter.route("/logout").post(verifyJWT, logoutUser);
userRouter.route("/refresh-access-token").post(refreshAccessToken);
userRouter.route("/change-password").post(verifyJWT, changeCurrentUserPassword);
userRouter.route("/current-user").get(verifyJWT, getCurrentUser);
userRouter.route("/update-account").patch(verifyJWT, updateUserDetails);
userRouter
  .route("/avatar")
  .patch(verifyJWT, upload.single("avatar"), updateUserAvatar);
userRouter
  .route("/cover-image")
  .patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);
userRouter.route("/c/:username").get(verifyJWT, getChannelProfile);
userRouter.route("/watch-history").get(verifyJWT, getWatchHistory);

export default userRouter;
