import User from '../models/users.js'
import Follow from '../models/follows.js';
import Publication from '../models/publications.js';
import bycript from 'bcrypt'
import { createToken } from '../services/jwt.js'
import { followThisUser, followUserIds } from '../services/followServices.js';

export const testUser = (req, res) => {
  return res.status(200).send({
    message: "Message send from the user's controller"
  })
}

export const register = async (req, res) => {
  try {
    let params = req.body;
    const { name, last_name, nick, email, password, bio } = params;
    if (!name || !last_name || !nick || !email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please fill all the fields'
      })
    }

    //Create new User (Our model User) based in the capture params.
    let userToSave = new User(params);

    //Using findOne mongoose User model to check if already exist the user we want to create.
    const existingUser = await User.findOne({
      $or: [
        { email: userToSave.email.toLowerCase() },
        { nick: userToSave.nick.toLowerCase() }
      ]
    })

    if (existingUser) {
      return res.status(409).send({
        status: 'Conflict',
        message: 'El usuario ya existe en la BD'
      })
    }

    //Encrypt password with bycript
    const salt = await bycript.genSalt(10);
    const hashedPassword = await bycript.hash(userToSave.password, salt);
    userToSave.password = hashedPassword;

    //Save user
    await userToSave.save();

    //Successfull response
    return res.status(201).json({
      status: 'Success',
      message: 'The user was created successfully',
      user_to_save: userToSave
    })
  } catch (error) {
    console.log(`There was an error in the user registration: ${error}`);
    return res.status(500).send({
      status: 'error',
      message: 'There was an error in user registration'
    })
  }
}

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).send({
        status: 'error',
        message: 'Please fill in email and password'
      })
    }

    const userDB = await User.findOne({ email: email.toLowerCase() })

    if (!userDB) {
      //send() sends a plain text, and json() sends an object in json format.
      return res.status(404).send({
        status: 'error',
        message: 'User not found or does not exist'
      });
    }

    const validPassword = await bycript.compare(password, userDB.password);

    if (!validPassword) {
      res.status(401).send({
        status: 'Authentication Failed',
        message: 'Input data is incorrect'
      })
    }

    const token = createToken(userDB);

    //Successfull response
    return res.status(201).json({
      status: 'Success',
      message: 'Successfully Authenticated',
      token,
      userDB: {
        id: userDB._id,
        name: userDB.name,
        last_name: userDB.last_name,
        email: userDB.email,
        nick: userDB.nick,
        image: userDB.image,
      }
      // userDB: { ...userDB }
    })
  } catch (error) {
    console.log(`There was an error in the user login: ${error}`);
    return res.status(500).send({
      status: 'error',
      message: 'There was an error in user login'
    })
  }
}

export const profile = async (req, res) => {
  try {
    //Capture id from URL
    const userId = req.params.id;

    if (!req.user || !req.user.userId) {
      return res.status(401).send({
        status: 'error',
        message: 'User is not authenticated'
      })
    }

    const userProfile = await User.findById(userId).select('-password -role -email -__v');
    if (!userProfile) {
      return res.status(404).send({
        status: 'error',
        message: 'User not found or does not exist'
      })
    }

    //Follow information: identified user id from token and user id whose we want to query from request url params.
    const followInfo = await followThisUser(req.user.userId, userId);

    return res.status(200).json({
      status: 'success',
      user: userProfile,
      followInfo
    })
  } catch (error) {
    console.log('There was a error recovering the user profile data');
    return res.status(500).send({
      status: 'error',
      message: 'There was a error recovering the user profile data'
    })
  }
}

export const listUsers = async (req, res) => {
  try {
    //parse string page into base 10 int or return page 1
    let page = req.params.page ? parseInt(req.params.page, 10) : 1;

    //setting results limit per page
    let itemsPerPage = req.query.limit ? paseInt(req.query.limit, 10) : 4;

    const options = {
      page: page,
      limit: itemsPerPage,
      select: '-password -email -role -__v'
    }

    const users = await User.paginate({}, options)

    if (!users || users.docs.length === 0) {
      return res.status(404).send({
        status: 'error',
        message: 'There are no users available'
      })
    }

    //List user's followers. Get the user ids array i folllow
    let followUsers = await followUserIds(req);

    return res.status(200).json({
      status: 'success',
      users: users.docs,
      totalDocs: users.totalDocs,
      totalPages: users.totalPages,
      currentPage: users.page,
      users_following: followUsers.following,
      user_follow_me: followUsers.followers
    })

  } catch (error) {
    console.log('There was a error listing the users');
    return res.status(500).send({
      status: 'error',
      message: 'There was a error listing the users'
    })
  }
}

export const updateUser = async (req, res) => {
  try {
    //Capture the user payload from the middleware
    let userIdentity = req.user;
    //Data send in the body that wee will update
    let userToUpdate = req.body;

    //delete fields that are not gonna be used.
    delete userToUpdate.iat;
    delete userToUpdate.exp;
    delete userToUpdate.role;

    //Check if the user already exist
    const users = await User.find({
      $or: [
        { email: userToUpdate.email },
        { nick: userToUpdate.nick }
      ]
    }).exec();

    const isDuplicatedUser = users.some(user => {
      return user && user._id.toString() !== userIdentity.userId;
    })

    if (isDuplicatedUser) {
      return res.status(401).send({
        status: 'error',
        message: 'There was a error. Only authenticated users can update their user data'
      })
    }

    //Encrypt password when user wants to update it
    if (userToUpdate.password) {
      try {
        let pwd = await bycript.hash(userToUpdate.password, 10);
        userToUpdate.password = pwd;
      } catch (hashError) {
        return res.status(500), send({
          status: 'error',
          message: 'There was an error encrypting your password'
        })
      }
    } else {
      delete userToUpdate.password;
    }

    //Update user
    let userUpdated = await User.findByIdAndUpdate(userIdentity.userId, userToUpdate, { new: true });

    if (!userUpdated) {
      return res.status(400).send({
        status: 'error',
        message: 'There was error updating the user data'
      })
    }

    return res.status(200).json({
      status: 'success',
      message: 'User udated successfully',
      user: userUpdated
    })
  } catch (error) {
    console.log('There was a error updating the user data');
    return res.status(500).send({
      status: 'error',
      message: 'There was a error updating the user data'
    })
  }
}

export const uploadAvatar = async (req, res) => {
  try {
    //Check if there is a file uploaded.
    if (!req.file) {
      return res.status(400).send({
        status: "error",
        message: "There was an error. There is no image in the request"
      });
    }

    //Get image path from cloudinary
    const avatarUrl = req.file.path;

    // Update image path into authenticated user.
    const userUpdated = await User.findByIdAndUpdate(
      req.user.userId,
      { image: avatarUrl },
      { new: true }
    );

    if (!userUpdated) {
      return res.status(500).send({
        status: "error",
        message: "There was an error uploading your avatar image"
      });
    }

    return res.status(200).json({
      status: "success",
      user: userUpdated,
      file: avatarUrl
    });

  } catch (error) {
    console.log("Error al subir el archivo del avatar", error);
    return res.status(500).send({
      status: "error",
      message: "Error al subir el archivo del avatar"
    });
  }
};

export const avatar = async (req, res) => {
  try {
    //Get user id from request params
    const userId = req.params.id;

    //Get user's avatar from the db
    const user = await User.findById(userId).select('image');

    if (!user || !user.image) {
      return res.status(404).send({
        status: "error",
        message: "The user does not exist or has no image"
      });
    }

    // Redirect to avatar image path
    return res.redirect(user.image)

  } catch (error) {
    console.log("There was an error showing the avatar", error);
    return res.status(500).send({
      status: "error",
      message: "There was an error showing the avatar"
    });
  }
};

// Method to show followers and publications counter
export const counters = async (req, res) => {
  try {
    // Get authenticated user id from token
    let userId = req.user.userId;
    // Check if an user id it's in the request url params. In case query user different from the current authenticated.
    if (req.params.id) {
      userId = req.params.id;
    }
    // Get user's name and lastname
    const user = await User.findById(userId, { name: 1, last_name: 1 });

    if (!user) {
      return res.status(404).send({
        status: "error",
        message: "User not found"
      });
    }

    // Counter for users that authenticated user follows.
    const followingCount = await Follow.countDocuments({ "following_user": userId });

    // Counter for users that follow the authenticated user
    const followedCount = await Follow.countDocuments({ "followed_user": userId });

    // Counter for publications made by authenticated user
    const publicationsCount = await Publication.countDocuments({ "user_id": userId });

    // Return counters
    return res.status(200).json({
      status: "success",
      userId,
      name: user.name,
      last_name: user.last_name,
      followingCount: followingCount,
      followedCount: followedCount,
      publicationsCount: publicationsCount
    });
  } catch (error) {
    console.log("There was an error generating the counters", error)
    return res.status(500).send({
      status: "error",
      message: "There was an error generating the counters"
    });
  }
}