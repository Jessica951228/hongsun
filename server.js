const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();

// 簡化 Session，使用內存
const sessions = {};
app.use((req, res, next) => {
    const sessionId = req.headers['x-session-id'] || 'none';
    req.session = sessions[sessionId] || { isAuthenticated: false };
    console.log(`[${new Date().toISOString()}] 請求: ${req.method} ${req.path}, Session ID: ${sessionId}, isAuthenticated: ${req.session.isAuthenticated}`);
    next();
});

// 中間件設定
app.use(cors({
    origin: process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? 'https://hongsunweb.onrender.com' : 'http://localhost:3000'),
    credentials: true,
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'x-session-id']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 確保 uploads 資料夾存在
const uploadsDir = path.join(__dirname, 'Uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// 設定 multer
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
    limits: { fileSize: 2 * 1024 * 1024 }, // 調整為 2MB，解決 File too large 問題
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('只允許上傳圖片檔案!'), false);
        }
    }
});

// 中間件：檢查是否登入
function isAuthenticated(req, res, next) {
    console.log(`[${new Date().toISOString()}] 檢查訪問: ${req.path}, Session ID: ${req.headers['x-session-id'] || 'none'}, isAuthenticated: ${req.session.isAuthenticated}`);
    if (req.session.isAuthenticated) {
        return next();
    }
    res.status(401).json({ success: false, message: '未登入' });
}

// 儲存產品
const productsFile = path.join(__dirname, 'products.json');
let products = [];

try {
    if (fs.existsSync(productsFile)) {
        const data = fs.readFileSync(productsFile, 'utf-8');
        const parsed = JSON.parse(data);
        products = Array.isArray(parsed) ? parsed : [];
        console.log(`[${new Date().toISOString()}] 成功載入 products.json，商品數: ${products.length}`);
    } else {
        console.log(`[${new Date().toISOString()}] products.json 不存在，初始化空陣列`);
        products = [];
        fs.writeFileSync(productsFile, JSON.stringify([], null, 2));
    }
} catch (err) {
    console.error(`[${new Date().toISOString()}] 載入 products.json 失敗: ${err.message}，初始化空陣列`);
    products = [];
    fs.writeFileSync(productsFile, JSON.stringify([], null, 2));
}

function saveProducts() {
    try {
        fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
        console.log(`[${new Date().toISOString()}] 成功儲存 products.json，商品數: ${products.length}`);
    } catch (err) {
        console.error(`[${new Date().toISOString()}] 儲存 products.json 失敗: ${err.message}`);
    }
}

// 定義 API 路由
app.get('/check-auth', (req, res) => {
    console.log(`[${new Date().toISOString()}] 檢查 /check-auth, Session ID: ${req.headers['x-session-id'] || 'none'}, isAuthenticated: ${req.session.isAuthenticated}`);
    res.json({ success: true, isAuthenticated: req.session.isAuthenticated });
});

app.post('/login', (req, res) => {
    console.log(`[${new Date().toISOString()}] 登入請求，收到資料: ${JSON.stringify(req.body)}`);
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const sessionId = req.headers['x-session-id'] || Date.now().toString();
    if (password && password === adminPassword) {
        sessions[sessionId] = { isAuthenticated: true };
        res.set('x-session-id', sessionId);
        console.log(`[${new Date().toISOString()}] 登入成功，設置 Session ID: ${sessionId}`);
        res.json({ success: true, message: '登入成功' });
    } else {
        console.log(`[${new Date().toISOString()}] 密碼錯誤`);
        res.status(401).json({ success: false, message: '密碼錯誤' });
    }
});

app.post('/logout', (req, res) => {
    console.log(`[${new Date().toISOString()}] 登出請求，Session ID: ${req.headers['x-session-id'] || 'none'}`);
    const sessionId = req.headers['x-session-id'];
    if (sessionId && sessions[sessionId]) {
        delete sessions[sessionId];
    }
    res.json({ success: true, message: '登出成功' });
});

app.get('/products', (req, res) => {
    res.json({ success: true, products: products, total: products.length });
});

app.get('/products/:id', (req, res) => {
    const productId = req.params.id;
    const product = products.find(p => p.id === productId);
    if (!product) {
        return res.status(404).json({ success: false, message: '找不到該產品' });
    }
    res.json({ success: true, product: product });
});

app.post('/add-product', isAuthenticated, (req, res) => {
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
        if (!Array.isArray(products)) {
            console.error(`[${new Date().toISOString()}] products 不是陣列，重新初始化`);
            products = [];
        }
        products.push(product);
        saveProducts();
        res.json({ success: true, message: '產品新增成功！', product: product });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] 新增產品錯誤: ${error}`);
        res.status(500).json({ success: false, message: '新增產品失敗: ' + error.message });
    }
});

app.delete('/products/:id', isAuthenticated, (req, res) => {
    const productId = req.params.id;
    console.log(`[${new Date().toISOString()}] 嘗試刪除產品，ID: ${productId}, 當前 products 數量: ${products.length}`);
    const productIndex = products.findIndex(p => p.id === productId);
    if (productIndex === -1) {
        console.log(`[${new Date().toISOString()}] 找不到產品 ID: ${productId}`);
        return res.status(404).json({ success: false, message: '找不到該產品' });
    }
    const deletedProduct = products.splice(productIndex, 1)[0];
    console.log(`[${new Date().toISOString()}] 成功刪除產品: ${deletedProduct.name}, 剩餘數量: ${products.length}`);
    saveProducts();
    if (deletedProduct.img) {
        const imagePath = path.join(__dirname, 'Uploads', deletedProduct.img);
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
            console.log(`[${new Date().toISOString()}] 刪除圖片: ${imagePath}`);
        }
    }
    res.json({ success: true, message: '產品刪除成功', deletedProduct });
});

app.post('/upload-image', isAuthenticated, upload.single('image'), (req, res) => {
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

// 靜態檔案服務
app.use(express.static(path.join(__dirname, 'public'))); // 支援 favicon.ico
app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));

// 動態路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index5.html'));
});

app.get('/admin.html', isAuthenticated, (req, res) => {
    console.log(`[${new Date().toISOString()}] 訪問 /admin.html, Session ID: ${req.headers['x-session-id'] || 'none'}, isAuthenticated: ${req.session.isAuthenticated}`);
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// 下載 products.json
app.get('/download-products', (req, res) => {
    const productsFile = path.join(__dirname, 'products.json');
    if (fs.existsSync(productsFile)) {
        res.setHeader('Content-Disposition', 'attachment; filename=products.json');
        res.setHeader('Content-Type', 'application/json');
        res.sendFile(productsFile);
    } else {
        res.status(404).json({ success: false, message: '文件不存在' });
    }
});

// 處理 favicon 請求，避免 404 日誌污染
app.get('/favicon.ico', (req, res) => {
    res.status(204).end(); // 無內容回應
});

// 錯誤處理中間件
app.use((error, req, res, next) => {
    console.error(`[${new Date().toISOString()}] 伺服器錯誤: ${error}`);
    res.status(500).json({ success: false, message: '伺服器內部錯誤: ' + error.message });
});

// 404 處理
app.use((req, res) => {
    console.log(`[${new Date().toISOString()}] 404 錯誤: ${req.method} ${req.path}`);
    res.status(404).json({ success: false, message: 'Not Found' });
});

// 啟動伺服器
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] 伺服器已啟動，網址: http://localhost:${PORT}`);
});