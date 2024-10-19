import { Schema, model } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const UserSchema = Schema({
  name: {
    type: String,
    required: true
  },
  last_name: {
    type: String,
    required: true
  },
  nick: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  bio: String,
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: 'role_user'
  },
  image: {
    type: String,
    default: 'default_user.png'
  },
  created_at: {
    type: Date,
    default: Date.now
  }
})

//Config mongo pagination plugin
UserSchema.plugin(mongoosePaginate);

//export name model name, schema name and mogodb collection.
export default model('User', UserSchema, 'users');