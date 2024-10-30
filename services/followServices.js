import Follow from "../models/follows.js";

// Get two arrays with the users ids i follow (following) and followers.
export const followUserIds = async (req, res) => {
  try {
    // Get the authenticated user id
    const identityUserId = req.user.userId;

    if (!identityUserId) {
      return res.status(400).send({
        status: "error",
        message: "User id missing"
      });
    }

    // Get an array with the users that the authenticated user follow.
    let following = await Follow.find({ "following_user": identityUserId })
      .select({ "followed_user": 1, "_id": 0 })
      .exec();

    // Get an array with the users that follow the authenticated user.
    let followers = await Follow.find({ "followed_user": identityUserId })
      .select({ "following_user": 1, "_id": 0 })
      .exec();

    // Set two arrays with just the user ids
    const user_following = following.map(follow => follow.followed_user);
    const user_follow_me = followers.map(follow => follow.following_user);

    return {
      following: user_following,
      followers: user_follow_me
    }

  } catch (error) {
    return {
      following: [],
      followers: []
    };
  }
}

// Obtenemos los datos de UN usuario que me está siguiendo a mi o que yo sigo
// Get the user information who is following the authenticated user or the authenticated user follows.
export const followThisUser = async (identityUserId, profileUserId) => {
  try {
    //Check if ids are valid
    if (!identityUserId || !profileUserId)
      throw new Error("Invalid user ids");

    // Check if authenticated user follows the user to query
    const following = await Follow.findOne({ "following_user": identityUserId, "followed_user": profileUserId });

    // Check if the user to query follows the authenticated user
    const follower = await Follow.findOne({ "following_user": profileUserId, "followed_user": identityUserId });

    return {
      following,
      follower
    }

  } catch (error) {
    console.log("There was an error getting the user information.", error);
    return {
      following: null,
      follower: null
    }
  }
}