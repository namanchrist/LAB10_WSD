const express = require('express');
const multer = require('multer');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = 3000;

// Body Parser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static folder to serve images
app.use('/uploads', express.static('uploads'));

// MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456789',
    database: 'image_upload'
});

db.connect((err) => {
    if (err) throw err;
    console.log('MySQL connected...');
});

// Multer Configuration
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 1000000 }, // Limit file size to 1MB
    fileFilter: (req, file, cb) => {
        checkFileType(file, cb);
    }
}).single('image');

// Check File Type
function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}

// Route to render an HTML form to upload images
app.get('/', (req, res) => {
    res.send(`
        <h2>Upload an Image</h2>
        <form action="/upload" method="POST" enctype="multipart/form-data">
            <input type="file" name="image" accept="image/*" required>
            <button type="submit">Upload Image</button>
        </form>
        <a href="/gallery">View Image Gallery</a>
    `);
});

// Route to upload an image
app.post('/upload', (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            res.send('Error: ' + err);
        } else {
            if (req.file == undefined) {
                res.send('No file selected!');
            } else {
                const imageName = req.file.filename;

                const sql = "INSERT INTO images (image_name) VALUES (?)";
                db.query(sql, [imageName], (err, result) => {
                    if (err) throw err;

                    // Redirect to the gallery after successful upload
                    res.redirect('/gallery');
                });
            }
        }
    });
});

// Route to view all uploaded images in a gallery
app.get('/gallery', (req, res) => {
    const sql = "SELECT image_name FROM images";
    db.query(sql, (err, results) => {
        if (err) throw err;

        let gallery = '<h2>Image Gallery</h2>';
        results.forEach(image => {
            gallery += `
                <div>
                    <img src="/uploads/${image.image_name}" alt="${image.image_name}" style="max-width: 300px; margin: 10px;"/>
                    <p>${image.image_name}</p>
                </div>
            `;
        });

        res.send(`
            <html>
                <head>
                    <style>
                        img { max-width: 100%; }
                        div { display: inline-block; text-align: center; margin: 10px; }
                        body { font-family: Arial, sans-serif; }
                    </style>
                </head>
                <body>
                    ${gallery}
                    <a href="/">Upload Another Image</a>
                </body>
            </html>
        `);
    });
});

app.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`);
});
