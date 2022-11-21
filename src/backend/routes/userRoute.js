import express from 'express';
import multer from 'multer';
import pool from '../config/db.js';

const router = express.Router();

const imageType = {
  ProfilePhoto: 'profile_photo',
  CoverPhoto: 'cover_photo'
};

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, '../../public/images');
  },
  filename(req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname.replace(/\s/g, '')}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
    req.fileValidationError = 'Invalid mimetype';
    return cb(null, false, new Error('Invalid mimetype'));
  }
  return cb(null, true);
};

const userValidator = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT u.walletId FROM user u WHERE u.walletId = ?', [req.query.id]);
    if (!rows.length) {
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

router.get('/user/slug', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT u.walletId, u.slug FROM user u WHERE u.walletId = ?', [req.query.id]);
    if (rows.length) {
      res.send(rows[0]);
    } else {
      res.status(404).send('User not found.');
    }
  } catch (err) {
    console.log(err);
    res.status(500).send();
  }
});

router.get('/user/id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT u.slug, u.walletId FROM user u WHERE u.slug = ?', [req.query.slug]);
    if (rows.length) {
      res.send(rows[0]);
    } else {
      res.status(404).send('User slug not found.');
    }
  } catch (err) {
    console.log(err);
    res.status(500).send();
  }
});

// TODO: Set up user controller and reuse code for profile and cover upload
router.post('/user/upload-profile-photo', userValidator, upload.single('profile-photo'), async (req, res) => {
  if (req.fileValidationError) {
    return res.status(412).end(req.fileValidationError);
  }
  if (!req.file) {
    return res.status(412).send('No file received');
  }
  // TODO: Handle image update case
  try {
    await pool.query(
      'INSERT INTO image VALUES (?,?,?,?)',
      [null, req.query.id, req.file.path.replace(/\.\.\//g, ''), imageType.ProfilePhoto]
    );
    return res.status(201).send('Image uploaded succesfully');
  } catch (err) {
    console.log(err);
    return res.status(500).send();
  }
});

router.post('/user/upload-cover-photo', userValidator, upload.single('cover-photo'), async (req, res) => {
  if (req.fileValidationError) {
    return res.status(412).end(req.fileValidationError);
  }
  if (!req.file) {
    return res.status(412).send('No file received');
  }
  // TODO: Handle image update case
  try {
    await pool.query(
      'INSERT INTO image VALUES (?,?,?,?)',
      [null, req.query.id, req.file.path.replace(/\.\.\//g, ''), imageType.CoverPhoto]
    );
    return res.status(201).send('Image uploaded succesfully');
  } catch (err) {
    console.log(err);
    return res.status(500).send();
  }
});

router.get('/user/profile-photo', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT i.user_id, i.image_path FROM image i WHERE i.user_id = ? AND i.type = ?',
      [req.query.id, imageType.ProfilePhoto]
    );
    if (rows.length) {
      res.send(rows[0]);
    } else {
      // TODO: Return default avatar
      res.status(404).send('User profile image not found.');
    }
  } catch (err) {
    console.log(err);
    res.status(500).send();
  }
});

router.get('/user/cover-photo', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT i.user_id, i.image_path FROM image i WHERE i.user_id = ? AND i.type = ?',
      [req.query.id, imageType.CoverPhoto]
    );
    if (rows.length) {
      res.send(rows[0]);
    } else {
      // TODO: Return default cover
      res.status(404).send('User cover image not found.');
    }
  } catch (err) {
    console.log(err);
    res.status(500).send();
  }
});

router.get('/user/name', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT u.walletId, u.name FROM user u WHERE u.walletId = ?', [req.query.id]);
    if (rows.length) {
      res.send(rows[0]);
    } else {
      res.status(404).send('User not found.');
    }
  } catch (err) {
    console.log(err);
    res.status(500).send();
  }
});

export default router;