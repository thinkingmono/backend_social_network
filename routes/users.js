import { Router } from 'express';
import { register, testUser, login, profile, listUsers, updateUser, uploadAvatar, avatar, counters } from '../controllers/user.js'
import { ensureAuth } from '../middleware/auth.js';
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import pkg from 'cloudinary';
const { v2: cloudinary } = pkg;

const router = Router();

// Cloudinary configuration to upload files
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'social-network',
    allowedFormats: ['jpg', 'png', 'jpeg', 'gif'],
    public_id: (req, file) => 'avatar-' + Date.now()
  }
});

// Configure multer file size limits
const uploads = multer({
  storage: storage,
  limits: { fileSize: 1 * 1024 * 1024 } // 1MB limit
});

router.get('/test-user', ensureAuth, testUser);
router.post('/register', register);
router.post('/login', login);
router.get('/profile/:id', ensureAuth, profile);
router.get('/list/:page?', ensureAuth, listUsers);
router.put('/update', ensureAuth, updateUser);
router.post('/upload-avatar', ensureAuth, uploads.single("file0"), uploadAvatar);
router.get('/avatar/:id', avatar);
router.get('/counters/:id?', ensureAuth, counters);

export default router;
