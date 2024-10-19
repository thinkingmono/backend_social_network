import { Router } from 'express';
import { testFollow } from '../controllers/follow.js';

const router = Router();

router.get('/test-follow', testFollow);


export default router;