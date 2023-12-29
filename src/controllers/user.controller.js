import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiRespose.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadFileOnCloudinary } from "../utils/cloudinary.js";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshtoken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "something went wrong while generating access and refresh tokens"
    );
  }
};

const registerUser = asyncHandler(async (req, resp) => {
  const { username, email, fullname, password } = req.body;

  if (
    [username, email, fullname, password].some((field) => {
      field?.trim === "";
    })
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({ $or: [{ username }, { email }] });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exist");
  }

  const avatarLocalFilePath = req.files?.avatar[0]?.path;
  //const coverImageLocalFilePath = req.files?.coverImage[0]?.path;
  let coverImageLocalFilePath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalFilePath = req.files.coverImage[0].path;
  }

  if (!avatarLocalFilePath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadFileOnCloudinary(avatarLocalFilePath);
  const coverImage = await uploadFileOnCloudinary(coverImageLocalFilePath);

  if (!avatar) {
    throw new ApiError(
      500,
      "Couldn't upload avatar image file, please try again"
    );
  }

  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverimage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshtoken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return resp
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, resp) => {
  const { email, username, password } = req.body;

  if (!email && !username && !password) {
    throw new ApiError(400, "Username or email and password is required");
  }

  const user = await User.findOne({ $or: [{ username }, { email }] });
  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshtoken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return resp
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "user logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, resp) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshtoken: undefined },
    },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return resp
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});

const refreshAccessToken = asyncHandler(async (req, resp) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized request");

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) throw new ApiError(401, "invalid refresh token");

    if (incomingRefreshToken !== user?.refreshtoken)
      throw new ApiError(401, "Refresh token is expired or invalid");

    const options = { httpOnly: true, secure: true };
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user?._id
    );

    return resp
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access token updated"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "invalid refresh token");
  }
});

const changeCurrentUserPassword = asyncHandler(async (req, resp) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) throw new ApiError(400, "Invalid old password");

  user.password = newPassword;
  await use.save({ validateBeforeSave: false });

  return resp
    .status(200)
    .json(new ApiResponse(200, {}, "password updated successfully"));
});

const getCurrentUser = asyncHandler(async (req, resp) => {
  return resp
    .status(200)
    .json(new ApiResponse(200, req.user, "current user fetched succesfully"));
});

const updateUserDetails = asyncHandler(async (req, resp) => {
  const { fullname, email } = req.body;
  if (!fullname || !email) throw new ApiError(400, "All fields are required");

  const user = User.findByIdAndUpdate(
    req.user?.id,
    { $set: { fullname: fullname, email: email } },
    { new: true }
  ).select("-password");

  return resp
    .status(200)
    .json(new ApiResponse(200, user, "User details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, resp) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) throw new ApiError(400, "Avatar file is missing");

  const avatar = await uploadFileOnCloudinary(avatarLocalPath);
  if (!avatar.url)
    throw new ApiError(400, "Error while uploading avatar on cloudinary");

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { avatar: avatar.url } },
    { new: true }
  ).select("-password");

  resp
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, resp) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) throw new ApiError(400, "Avatar file is missing");

  const coverImage = await uploadFileOnCloudinary(coverImageLocalPath);
  if (!coverImage.url)
    throw new ApiError(400, "Error while uploading cover image on cloudinary");

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { coverimage: coverImage.url } },
    { new: true }
  ).select("-password");

  resp
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully"));
});

const getChannelProfile = asyncHandler(async (req, resp) => {
  const { username } = req.params;
  if (!username?.trim) throw new ApiError(400, "username is missing");

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        local: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        local: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        avatar: 1,
        coverimage: 1,
        email: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
      },
    },
  ]);
  if (!channel?.length) throw new ApiError(404, "channel does not exist");

  return resp
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "user channel fetched successfully")
    );
});

const getWatchHistory = asyncHandler(async (req, resp) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchhistory",
        foreignField: "_id",
        as: "watchhistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: new mongoose.Types.ObjectId(req.user?._id),
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    usernmae: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                // extracts first element of an array of field owner from previous pipeline
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);
  return resp
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "watched history fetched successfully"
      )
    );
});
export {
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
};
