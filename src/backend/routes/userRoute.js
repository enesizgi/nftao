import express from 'express';
import multer from 'multer';
import fs from 'fs';
import User from '../models/user.js';
import Image from '../models/image.js';
import { apiBaseURL, apiProtocol } from '../constants.js';
import { verifyMessage } from '../utils/index.js';

const router = express.Router();

const imageType = {
  ProfilePhoto: 'profile_photo',
  CoverPhoto: 'cover_photo'
};

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'assets/images');
  },
  filename(req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname.replace(/\s/g, '')}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|avif|webp)$/)) {
    req.fileValidationError = 'Invalid mimetype';
    return cb(null, false, new Error('Invalid mimetype'));
  }
  return cb(null, true);
};

const userValidator = async (req, res, next) => {
  try {
    const user = req.query.id && (await User.findOne({ walletId: req.query.id }).lean());
    if (!user) {
      return res.status(404).send('User not found');
    }
  } catch (err) {
    console.log(err);
    return res.status(500).send();
  }
  return next();
};

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 5
  },
  fileFilter
});
// TODO: Merge /user/check and /user/create endpoints. Create user if not exists. And after creating user, return user data.
router.get('/user/check', async (req, res) => {
  try {
    const user = req.query.id && (await User.findOne({ walletId: req.query.id }).lean());
    if (user) {
      const { walletId: id, _id, ...rest } = user;
      return res.send({ id, ...rest });
    }
    return res.status(404).send('User not found');
  } catch (err) {
    console.log(err);
    return res.status(500).send();
  }
});

router.post('/user/create', verifyMessage, async (req, res) => {
  try {
    await User.create({ walletId: req.query.id, slug: null, name: 'Unnamed' });
    return res.status(201).send({ status: 'User saved successfully', id: req.query.id });
  } catch (err) {
    console.log(err);
    return res.status(500).send();
  }
});

router.get('/user', async (req, res) => {
  try {
    const searchKey = req.query.id ? 'walletId' : 'slug';
    const value = req.query.id || req.query.slug;
    const user = req.query.id && (await User.findOne({ [searchKey]: value }).lean());
    const images = user ? await Image.find({ user_id: user.walletId }).lean() : [];
    const imageObj = {};
    images.forEach(row => {
      if (row.type === imageType.ProfilePhoto) {
        imageObj.profilePhoto = `${apiProtocol}://${apiBaseURL}/${row.image_path}`;
      } else if (row.type === imageType.CoverPhoto) {
        imageObj.coverPhoto = `${apiProtocol}://${apiBaseURL}/${row.image_path}`;
      }
    });

    if (user) {
      const { _id, walletId: id, ...rest } = user;
      return res.send({ ...rest, ...imageObj, id });
    }
    return res.status(404).send();
  } catch (err) {
    console.log(err);
    return res.status(500).send();
  }
});

router.get('/user/slug', async (req, res) => {
  try {
    const user = req.query.id && (await User.findOne({ walletId: req.query.id }).lean());
    if (user) {
      const { walletId: id, _id, ...rest } = user;
      return res.send({ id, ...rest });
    }
    // default response for the demo: will be changed
    return res.status(404).send();
  } catch (err) {
    console.log(err);
    return res.status(500).send();
  }
});

router.get('/user/id', async (req, res) => {
  try {
    const user = req.query.id && (await User.findOne({ slug: req.query.slug }).lean());
    if (user) {
      const { walletId: id, _id, ...rest } = user;
      return res.send({ id, ...rest });
    }
    // default response for the demo: will be changed
    return res.status(404).send();
  } catch (err) {
    console.log(err);
    return res.status(500).send();
  }
});

async function uploadPhoto(req, id, url, type) {
  const absolutePath = `${apiProtocol}://${apiBaseURL}/${url}`;
  const image = id && type && (await Image.findOne({ user_id: id, type }).lean());
  if (image) {
    await Image.updateOne({ user_id: id, type }, { image_path: url });
    // DELETE OLD FILE
    fs.unlink(image.image_path, error => {
      if (error) console.log('Error occured while deleting file ', error);
    });
    return absolutePath;
  }
  await Image.create({ user_id: id, image_path: url, type });
  return absolutePath;
}

// TODO: Set up user controller and reuse code for profile and cover upload
router.post('/user/upload-profile-photo', userValidator, verifyMessage, upload.single('profile-photo'), async (req, res) => {
  if (req.fileValidationError) {
    return res.status(412).end(req.fileValidationError);
  }
  if (!req.file) {
    return res.status(412).send('No file received');
  }

  try {
    const relativePath = req.file.path.replace(/\.\.\//g, '');
    const absolutePath = await uploadPhoto(req, req.query.id, relativePath, imageType.ProfilePhoto);
    return res.status(201).send({ url: absolutePath });
  } catch (err) {
    console.log(err);
    return res.status(500).send();
  }
});

router.post('/user/upload-cover-photo', userValidator, verifyMessage, upload.single('cover-photo'), async (req, res) => {
  if (req.fileValidationError) {
    return res.status(412).end(req.fileValidationError);
  }
  if (!req.file) {
    return res.status(412).send('No file received');
  }

  try {
    const relativePath = req.file.path.replace(/\.\.\//g, '');
    const absolutePath = await uploadPhoto(req, req.query.id, relativePath, imageType.CoverPhoto);
    return res.status(201).send({ url: absolutePath });
  } catch (err) {
    console.log(err);
    return res.status(500).send();
  }
});

router.get('/user/profile-photo', async (req, res) => {
  try {
    const image = req.query.id && imageType.ProfilePhoto && (await Image.findOne({ user_id: req.query.id, type: imageType.ProfilePhoto }).lean());
    if (image) {
      const { _id, user_id: id, image_path: url, ...rest } = image;
      return res.send({ ...rest, id, url: `${apiProtocol}://${apiBaseURL}/${image.url}` });
    }
    return res.status(404).send();
  } catch (err) {
    console.log(err);
    return res.status(500).send();
  }
});

router.get('/user/cover-photo', async (req, res) => {
  try {
    const image = req.query.id && imageType.ProfilePhoto && (await Image.findOne({ user_id: req.query.id, type: imageType.CoverPhoto }).lean());
    if (image) {
      const { _id, user_id: id, image_path: url, ...rest } = image;
      return res.send({ ...rest, id, url: `${apiProtocol}://${apiBaseURL}/${image.url}` });
    }
    return res.status(404).send();
  } catch (err) {
    console.log(err);
    return res.status(500).send();
  }
});

router.get('/user/name', async (req, res) => {
  try {
    const user = req.query.id && (await User.findOne({ walletId: req.query.id }).lean());
    if (user && Object.keys(user).length) {
      const { _id, walletId: id, ...rest } = user;
      return res.send({ id, ...rest });
    }
    return res.status(404).send();
  } catch (err) {
    console.log(err);
    return res.status(500).send();
  }
});

export default router;
