import { connect } from "mongoose";
import dotenv from 'dotenv';

dotenv.config();

const connection = async () => {
  try {
    await connect(process.env.MONGODB_URI);
    console.log('Database connected');
  } catch (error) {
    console.log('There was an error in the database connection');
    throw new Error('We couldnt connect to database');
  }
}

export default connection;