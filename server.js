const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { Pool } = require('pg'); // 添加 PostgreSQL 依賴

const app = express();
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Render 要求 SSL
});

// 初始化資料表
pool.query(`
    CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        img TEXT NOT NULL,
        description TEXT,
        minOrder TEXT,
        productionTime TEXT,
        shopeeLink TEXT,
        createdAt TEXT NOT NULL
    )
`).catch(err => console.error('資料庫初始化失敗:', err));

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

// 備份資料庫（暫時保留 SQLite 備份邏輯，後續可優化）
app.get('/backup-db', (req, res) => {
    const backupPath = path.join(__dirname, `products_backup_${new Date().toISOString().replace(/:/g, '-')}.db`);
    // 注意：PostgreSQL 備份需使用 pg_dump，後續可整合
    res.status(501).json({ success: false, message: 'PostgreSQL 備份尚未實現，請聯繫管理員' });
});

// 獲取所有產品
app.get('/products', (req, res) => {
    pool.query("SELECT * FROM products", (err, result) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, products: result.rows, total: result.rowCount });
    });
});

// 獲取單一產品
app.get('/products/:id', (req, res) => {
    const productId = req.params.id;
    pool.query("SELECT * FROM products WHERE id = $1", [productId], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (result.rowCount === 0) return res.status(404).json({ success: false, message: '找不到該產品' });
        res.json({ success: true, product: result.rows[0] });
    });
});

// 新增產品
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
        pool.query(
            "INSERT INTO products (id, name, img, description, minOrder, productionTime, shopeeLink, createdAt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
            [product.id, product.name, product.img, product.description, product.minOrder, product.productionTime, product.shopeeLink, product.createdAt],
            (err) => {
                if (err) return res.status(500).json({ success: false, message: err.message });
                res.json({ success: true, message: '產品新增成功！', product: product });
            }
        );
    } catch (error) {
        console.error(`[${new Date().toISOString()}] 新增產品錯誤: ${error}`);
        res.status(500).json({ success: false, message: '新增產品失敗: ' + error.message });
    }
});

// 刪除產品
app.delete('/products/:id', (req, res) => {
    const productId = req.params.id;
    pool.query("SELECT img FROM products WHERE id = $1", [productId], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (result.rowCount === 0) return res.status(404).json({ success: false, message: '找不到該產品' });
        pool.query("DELETE FROM products WHERE id = $1", [productId], (err) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            const imagePath = path.join(__dirname, 'Uploads', result.rows[0].img);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
                console.log(`[${new Date().toISOString()}] 刪除圖片: ${imagePath}`);
            }
            res.json({ success: true, message: '產品刪除成功' });
        });
    });
});

// 上傳圖片
app.post('/upload-image', upload.single('image'), (req, res) => {
    console.log(`[${new Date().toISOString()}] 上傳請求收到, 文件大小: ${req.headers['content-length']} bytes`);
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

app.get('/admin.html', (req, res) => {
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
    pool.end(() => console.log('資料庫連線關閉'));
});