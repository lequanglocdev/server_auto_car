import express from 'express';
import { signIn, signUp,signOut,refreshToken, acctiveAccountWithOtp } from '../controllers/authController.js';

const router = express.Router();

// Define your authentication routes here
router.post('/signup', signUp); 
router.post('/signin', signIn);
router.post('/signout', signOut);
router.post('/refresh', refreshToken);
router.post('/active', acctiveAccountWithOtp)
export default router;
