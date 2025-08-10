const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const db = new sqlite3.Database(path.join(__dirname, 'products.db'));

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            name TEXT,
            img TEXT,
            description TEXT,
            minOrder TEXT,
            productionTime TEXT,
            shopeeLink TEXT,
            createdAt TEXT
        )
    `);
});

app.use(cors({
    origin: process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? 'https://hongsunweb.onrender.com' : 'http://localhost:3000'),
    credentials: true,
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'x-session-id']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const uploadsDir = path.join(__dirname, 'Uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'Uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('只允許上傳圖片檔案!'), false);
        }
    }
});

app.get('/backup-db', (req, res) => { // 移除 isAuthenticated
    const backupPath = path.join(__dirname, `products_backup_${new Date().toISOString().replace(/:/g, '-')}.db`);
    db.backup(backupPath, (err) => {
        if (err) {
            console.error(`[${new Date().toISOString()}] 備份失敗: ${err.message}`);
            return res.status(500).json({ success: false, message: '備份失敗' });
        }
        res.download(backupPath, `products_backup_${new Date().toISOString().split('T')[0]}.db`, (err) => {
            if (err) console.error(`[${new Date().toISOString()}] 下載備份失敗: ${err.message}`);
            fs.unlinkSync(backupPath);
        });
    });
});

app.get('/products', (req, res) => {
    db.all("SELECT * FROM products", [], (err, rows) => {
        if (err) {
            console.error(`[${new Date().toISOString()}] 查詢產品錯誤: ${err.message}`);
            return res.status(500).json({ success: false, message: err.message });
        }
        console.log(`[${new Date().toISOString()}] 成功返回 ${rows.length} 個產品`);
        res.json({ success: true, products: rows, total: rows.length });
    });
});

app.get('/products/:id', (req, res) => {
    const productId = req.params.id;
    console.log(`[${new Date().toISOString()}] 查詢產品 ID: ${productId}`);
    db.get("SELECT * FROM products WHERE id = ?", [productId], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (!row) return res.status(404).json({ success: false, message: '找不到該產品' });
        res.json({ success: true, product: row });
    });
});

app.post('/add-product', (req, res) => {
    try {
        const { name, img, description, minOrder, productionTime, shopeeLink } = req.body;
        if (!name || !img) {
            return res.status(400).json({ success: false, message: '產品名稱和圖片為必填' });
        }
        const product = {
            id: Date.now().toString(),
            name: name.trim(),
            img: img,
            description: description ? description.trim() : '',
            minOrder: minOrder || '',
            productionTime: productionTime || '',
            shopeeLink: shopeeLink || '',
            createdAt: new Date().toISOString()
        };
        db.run(
            "INSERT INTO products (id, name, img, description, minOrder, productionTime, shopeeLink, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [product.id, product.name, product.img, product.description, product.minOrder, product.productionTime, product.shopeeLink, product.createdAt],
            (err) => {
                if (err) {
                    console.error(`[${new Date().toISOString()}] 資料庫插入錯誤: ${err.message}`);
                    return res.status(500).json({ success: false, message: err.message });
                }
                console.log(`[${new Date().toISOString()}] 產品新增成功: ${product.name}`);
                res.json({ success: true, message: '產品新增成功！', product: product });
            }
        );
    } catch (error) {
        console.error(`[${new Date().toISOString()}] 新增產品錯誤: ${error}`);
        res.status(500).json({ success: false, message: '新增產品失敗: ' + error.message });
    }
});

app.delete('/products/:id', (req, res) => { // 移除 isAuthenticated
    const productId = req.params.id;
    db.get("SELECT img FROM products WHERE id = ?", [productId], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (!row) return res.status(404).json({ success: false, message: '找不到該產品' });
        db.run("DELETE FROM products WHERE id = ?", [productId], (err) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            if (row.img) {
                const imagePath = path.join(__dirname, 'Uploads', row.img);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                    console.log(`[${new Date().toISOString()}] 刪除圖片: ${imagePath}`);
                }
            }
            res.json({ success: true, message: '產品刪除成功' });
        });
    });
});

app.post('/upload-image', upload.single('image'), (req, res) => { // 移除 isAuthenticated
    console.log(`[${new Date().toISOString()}] 上傳請求收到, 文件大小: ${req.headers['content-length']} bytes, Headers: ${JSON.stringify(req.headers)}`);
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: '沒有上傳檔案' });
        }
        res.json({ success: true, message: '圖片上傳成功', filename: req.file.filename, url: `/uploads/${req.file.filename}` });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] 圖片上傳錯誤: ${error}`);
        res.status(500).json({ success: false, message: '圖片上傳失敗: ' + error.message });
    }
});

app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index5.html'));
});

app.get('/admin.html', (req, res) => { // 移除 isAuthenticated
    console.log(`[${new Date().toISOString()}] 訪問 /admin.html`);
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

app.use((error, req, res, next) => {
    console.error(`[${new Date().toISOString()}] 伺服器錯誤: ${error}`);
    res.status(500).json({ success: false, message: '伺服器內部錯誤: ' + error.message });
});

app.use((req, res) => {
    console.log(`[${new Date().toISOString()}] 404 錯誤: ${req.method} ${req.path}`);
    res.status(404).json({ success: false, message: 'Not Found' });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] 伺服器已啟動，網址: http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
    db.close();
});