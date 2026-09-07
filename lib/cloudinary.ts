import { v2 as cloudinary } from 'cloudinary';

const cloud_name = process.env.CLOUDINARY_CLOUD_NAME || 'fqeqqzye';
const api_key = process.env.CLOUDINARY_API_KEY || '318123676451762';
const api_secret = process.env.CLOUDINARY_API_SECRET || 'yFd-hetu6rm-vaalT88HAmZ8bzI';

cloudinary.config({
  cloud_name,
  api_key,
  api_secret,
  secure: true,
});

export default cloudinary;

