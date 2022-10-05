const multer = require('multer');
const uuid = require('uuid').v1();

const MIME_TYPE_MAP = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpg',
}

const fileUpload = multer({
  // 500,000 bytes/ 500 kilobytes
  limits: 500000,
  // Here we can control how data should get stored
  // This storage key requires a multer storage driver (built in disk storage driver), so we generate it to storage
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/images');
    },
    filename: (req, file, cb) => {
      const ext = MIME_TYPE_MAP[file.mimetype];
      // null => null as a first argument - we shouldn't get error here, because we succeeded
      cb(null, uuid + '.' + ext);
    }
  }),
  fileFilter: (req, file, cb) => {
    // !! => Either true or false stored in isValid
    const isValid = !!MIME_TYPE_MAP[file.mimetype];
    let error = isValid ? null : new Error('Invalid mime type');
    cb(error, isValid);
  }
})

module.exports = fileUpload;