import User from '../models/users.js'
import bycript from 'bcrypt'
import { createToken } from '../services/jwt.js'

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

    return res.status(200).json({
      status: 'success',
      user: userProfile
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

    return res.status(200).json({
      status: 'success',
      users: users.docs,
      totalDocs: users.totalDocs,
      totalPages: users.totalPages,
      currentPage: users.page
    })

  } catch (error) {
    console.log('There was a error listing the users');
    return res.status(500).send({
      status: 'error',
      message: 'There was a error listing the users'
    })
  }
}