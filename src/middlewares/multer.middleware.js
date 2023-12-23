import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, "./public/images");
  },
  filename: function (req, file, callback) {
    //const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    //callback(null, file.fieldname + "-" + uniqueSuffix);
    callback(null, file.originalname);
  },
});

export const upload = multer({
  storage: storage,
});
