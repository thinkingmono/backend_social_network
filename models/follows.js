import { Schema, model } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const FollowSchema = Schema({
  following_user: {
    type: Schema.ObjectId,
    ref: 'User',
    required: true
  },
  followed_user: {
    type: Schema.ObjectId,
    ref: 'User',
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
});

//Config mongo pagination plugin
UserSchema.plugin(mongoosePaginate);

//Adding unique relation between following_user and followed_user. No repeat documents.
FollowSchema.index({ following_user: 1, followed_user: 1 }, { unique });

//export name model name, schema name and mogodb collection.
export default model('Follow', FollowSchema, 'follows');