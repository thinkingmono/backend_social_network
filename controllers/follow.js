import User from '../models/users.js'
import Follow from '../models/follows.js'
import { followUserIds } from '../services/followServices.js'


export const testFollow = (req, res) => {
  return res.status(200).send({
    message: "Message send from the follow's controller"
  })
}

// Create a follow relation and store it into db
export const saveFollow = async (req, res) => {
  try {
    const { followed_user } = req.body;
    //Take user from auth middleware.
    const identity = req.user;
    //Check if there's an user
    if (!identity || !identity.userId) {
      return res.status(400).send({
        status: 'error',
        message: "There's no user to do the following"
      })
    }
    if (identity.userId === followed_user) {
      return res.status(400).send({
        status: 'error',
        message: "You can't follow yourself"
      })
    }

    //Verify if user to follow exist
    const followedUser = await User.findById(followed_user);
    if (!followedUser) {
      return res.status(404).send({
        status: 'error',
        message: "The user you trying to follow does not exist"
      })
    }

    //Check if already exist a follow between the two users.
    const existingFollow = await Follow.findOne({
      following_user: identity.userId,
      followed_user: followed_user
    });

    if (existingFollow) {
      return res.status(400).send({
        status: 'error',
        message: "You already follow this user"
      })
    }

    //Create the follow object with follow model
    const newFollow = new Follow({
      following_user: identity.userId,
      followed_user: followed_user
    })

    //save object into DB
    const followStored = await newFollow.save();

    //Check if user save correctly
    if (!followStored) {
      return res.status(500).send({
        status: 'error',
        message: "There was an error. You have not been able to follow the user"
      })
    }

    //Get user's name and last name
    const followedUSerDetails = await User.findById(followed_user).select('name last_name');

    if (!followedUSerDetails) {
      return res.status(404).send({
        status: 'error',
        message: "User not found"
      })
    }

    //Merge data followed and following user.
    const combinedFollowData = {
      ...followStored.toObject(),
      followedUser: {
        name: followedUSerDetails.name,
        last_name: followedUSerDetails.last_name
      }
    };

    return res.status(200).json({
      status: 'success',
      identity: req.user,
      follow: combinedFollowData
    })


  } catch (error) {
    //Check if there's a duplicate index into database
    if (error.code === 11000) {
      return res.status(400).send({
        status: 'error',
        message: "You already follow this user"
      })
    }
    return res.status(500).send({
      status: 'error',
      message: 'There was an error following the user'
    })
  }
}

// Delete follow relation from db
export const unfollow = async (req, res) => {
  try {
    // Get authenticated user id from token
    const userId = req.user.userId;

    // Get followed user id which authenticated user wants to stop follow
    const followedId = req.params.id;

    // Look for follow matches which include both user ids
    const followDeleted = await Follow.findOneAndDelete({
      following_user: userId, // quien realiza el seguimiento
      followed_user: followedId // a quien se quiere dejar de seguir
    });

    if (!followDeleted) {
      return res.status(404).send({
        status: "error",
        message: "Users not follow each other."
      });
    }

    return res.status(200).send({
      status: "success",
      message: "You stop follow the user successfully."
    });

  } catch (error) {
    return res.status(500).send({
      status: "error",
      message: "There was an error when you tried to stop follow this user."
    });
  }
}

// List users that user follow. (followed)
export const following = async (req, res) => {
  try {
    // Get authenticated user id.
    let userId = req.user && req.user.userId ? req.user.userId : undefined;

    // Check if user id you want to query comes into request url params
    if (req.params.id) userId = req.params.id;

    // Assign default page based in page param in request or default 5.
    let page = req.params.page ? parseInt(req.params.page, 10) : 1;

    // Set number of users to show by page
    let itemsPerPage = req.query.limit ? parseInt(req.query.limit, 10) : 5;

    // Config query options
    const options = {
      page: page,
      limit: itemsPerPage,
      populate: {
        path: 'followed_user',
        select: '-password -role -__v -email'
      },
      lean: true
    }

    // Look for user followed users in the db and populate users data
    const follows = await Follow.paginate({ following_user: userId }, options);

    // List user's followers and users he follows.
    let followUsers = await followUserIds(req);

    return res.status(200).send({
      status: "success",
      message: "Following List",
      follows: follows.docs,
      total: follows.totalDocs,
      pages: follows.totalPages,
      page: follows.page,
      limit: follows.limit,
      users_following: followUsers.following,
      user_follow_me: followUsers.followers
    });

  } catch (error) {
    return res.status(500).send({
      status: "error",
      message: "There was an error listing the users you follow"
    });
  }
}

// List users who follow the user (followers)
export const followers = async (req, res) => {
  try {
    // Get authenticated user id from token
    let userId = req.user && req.user.userId ? req.user.userId : undefined;

    // Check if user id you want to query comes into request params url
    if (req.params.id) userId = req.params.id;

    // Set page number
    let page = req.params.page ? parseInt(req.params.page, 10) : 1;

    // Set number of users to show by page
    let itemsPerPage = req.query.limit ? parseInt(req.query.limit, 10) : 5;

    // Config query options
    const options = {
      page: page,
      limit: itemsPerPage,
      populate: {
        path: 'following_user',
        select: '-password -role -__v -email'
      },
      lean: true
    }

    // Look for user followers in the db and populate users data
    const follows = await Follow.paginate({ followed_user: userId }, options);

    // List user's followers and users he follows.
    let followUsers = await followUserIds(req);

    return res.status(200).send({
      status: "success",
      message: "Followers List",
      follows: follows.docs,
      total: follows.totalDocs,
      pages: follows.totalPages,
      page: follows.page,
      limit: follows.limit,
      users_following: followUsers.following,
      user_follow_me: followUsers.followers
    });

  } catch (error) {
    return res.status(500).send({
      status: "error",
      message: "There was an error listing the users who follow you"
    });
  }
}