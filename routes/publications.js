import { Router } from 'express';
import { testPublication } from '../controllers/publication.js';

const router = Router();

router.get('/test-publication', testPublication);

export default router;