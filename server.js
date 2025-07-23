const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const session = require('express-session');

const app = express();

// 中間件設定
app.use(cors({
    origin: process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? 'https://your-app.onrender.com' : 'http://localhost:3000'),
    credentials: true,
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '.')));
app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));

// Session 設定
app.use(session({
    secret: process.env.SESSION_SECRET || 'hongsun-secret-2025-secure',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax'
    }
}));

// 診斷 session
app.use((req, res, next) => {
    console.log(`請求: ${req.method} ${req.path}, Session ID: ${req.sessionID}, isAuthenticated: ${req.session.isAuthenticated}`);
    next();
});

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
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('只允許上傳圖片檔案!'), false);
        }
    }
});

// 儲存產品
const productsFile = path.join(__dirname, 'products.json');
let products = [];

try {
    if (fs.existsSync(productsFile)) {
        const data = fs.readFileSync(productsFile, 'utf-8');
        const parsed = JSON.parse(data);
        products = Array.isArray(parsed) ? parsed : [];
        console.log('成功載入 products.json，商品數:', products.length);
    } else {
        fs.writeFileSync(productsFile, JSON.stringify([], null, 2));
        console.log('創建新的 products.json');
    }
} catch (err) {
    console.error('載入 products.json 失敗:', err.message);
    products = [];
    fs.writeFileSync(productsFile, JSON.stringify([], null, 2));
}

function saveProducts() {
    try {
        fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
        console.log('成功儲存 products.json，商品數:', products.length);
    } catch (err) {
        console.error('儲存 products.json 失敗:', err.message);
    }
}

// 中間件：檢查是否登入
function isAuthenticated(req, res, next) {
    console.log(`檢查訪問: ${req.path}, Session ID: ${req.sessionID}, isAuthenticated: ${req.session.isAuthenticated}`);
    if (req.session.isAuthenticated) {
        return next();
    }
    console.log('未登入，重定向到 /login.html');
    res.redirect('/login.html');
}

// 路由：檢查登入狀態
app.get('/check-auth', (req, res) => {
    console.log('檢查 /check-auth, isAuthenticated:', req.session.isAuthenticated);
    res.json({ success: true, isAuthenticated: !!req.session.isAuthenticated });
});

// 路由：登入
app.post('/login', (req, res) => {
    console.log('登入請求，收到資料:', req.body);
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    console.log('比較密碼:', password, '與', adminPassword);
    if (password === adminPassword) {
        req.session.isAuthenticated = true;
        console.log('登入成功，Session:', req.session);
        res.json({ success: true, message: '登入成功' });
    } else {
        console.log('密碼錯誤');
        res.status(401).json({ success: false, message: '密碼錯誤' });
    }
});

// 路由：登出
app.post('/logout', (req, res) => {
    console.log('登出請求，銷毀 Session');
    req.session.destroy(() => {
        res.json({ success: true, message: '登出成功' });
    });
});

// 路由：首頁
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index5.html'));
});

// 路由：後台頁面
app.get('/admin.html', isAuthenticated, (req, res) => {
    console.log('訪問 /admin.html, isAuthenticated:', req.session.isAuthenticated);
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// 路由：圖片上傳
app.post('/upload-image', isAuthenticated, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: '沒有上傳檔案' });
        }
        res.json({ 
            success: true,
            message: '圖片上傳成功',
            filename: req.file.filename,
            url: `/uploads/${req.file.filename}`
        });
    } catch (error) {
        console.error('圖片上傳錯誤:', error);
        res.status(500).json({ success: false, message: '圖片上傳失敗: ' + error.message });
    }
});

// 路由：新增產品
app.post('/add-product', isAuthenticated, (req, res) => {
    try {
        const { name, price, img, description } = req.body;
        if (!name || !price || !img) {
            return res.status(400).json({ success: false, message: '產品名稱、價格和圖片為必填' });
        }
        
        const product = {
            id: Date.now().toString(),
            name: name.trim(),
            price: parseFloat(price),
            img: img,
            description: description ? description.trim() : '',
            createdAt: new Date().toISOString()
        };
        
        if (!Array.isArray(products)) {
            console.error('products 不是陣列，重新初始化');
            products = [];
        }
        
        products.push(product);
        saveProducts();
        
        res.json({ 
            success: true,
            message: '產品新增成功！',
            product: product
        });
    } catch (error) {
        console.error('新增產品錯誤:', error);
        res.status(500).json({ success: false, message: '新增產品失敗: ' + error.message });
    }
});

// 路由：取得所有產品
app.get('/products', (req, res) => {
    res.json({ success: true, products: products, total: products.length });
});

// 路由：根據 ID 取得單一產品
app.get('/products/:id', (req, res) => {
    const productId = req.params.id;
    const product = products.find(p => p.id === productId);
    
    if (!product) {
        return res.status(404).json({ success: false, message: '找不到該產品' });
    }
    
    res.json({ success: true, product: product });
});

// 路由：刪除產品
app.delete('/products/:id', isAuthenticated, (req, res) => {
    const productId = req.params.id;
    const productIndex = products.findIndex(p => p.id === productId);
    
    if (productIndex === -1) {
        return res.status(404).json({ success: false, message: '找不到該產品' });
    }
    
    const deletedProduct = products.splice(productIndex, 1)[0];
    saveProducts();
    
    if (deletedProduct.img) {
        const imagePath = path.join(__dirname, 'Uploads', deletedProduct.img);
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }
    }
    
    res.json({ success: true, message: '產品刪除成功', deletedProduct });
});

// 錯誤處理中間件
app.use((error, req, res, next) => {
    console.error('伺服器錯誤:', error);
    res.status(500).json({ success: false, message: '伺服器內部錯誤: ' + error.message });
});

// 404 處理
app.use((req, res) => {
    console.log(`404 錯誤: ${req.method} ${req.path}`);
    res.status(404).json({ success: false, message: 'Not Found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`伺服器已啟動，網址: http://localhost:${PORT}`);
});