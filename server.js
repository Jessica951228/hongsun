const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const session = require('express-session');

const app = express();

// 中間件設定
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('./'));
app.use('/uploads', express.static('uploads'));

// Session 設定
app.use(session({
    secret: 'your-secret-key-2025-hongsun', // 更安全的隨機密鑰
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // 本地測試設為 false，部署 HTTPS 設為 true
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // session 有效期 1 天
    }
}));

// 診斷 session 中間件
app.use((req, res, next) => {
    console.log(`請求路徑: ${req.path}, Session ID: ${req.sessionID}, isAuthenticated: ${req.session.isAuthenticated}`);
    next();
});

// 確保 uploads 資料夾存在
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// 設定 multer 用於圖片上傳
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
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

// 儲存產品的 JSON 檔案
const productsFile = path.join(__dirname, 'products.json');
let products = [];

// 初始化 products，確保為陣列
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
    console.log(`檢查 /admin.html 訪問, Session ID: ${req.sessionID}, isAuthenticated: ${req.session.isAuthenticated}`);
    if (req.session.isAuthenticated) {
        return next();
    }
    console.log('未登入，重定向到 /login.html');
    res.redirect('/login.html');
}

// 路由：檢查登入狀態
app.get('/check-auth', (req, res) => {
    console.log('檢查登入狀態:', req.session.isAuthenticated);
    res.json({ isAuthenticated: !!req.session.isAuthenticated });
});

// 路由：登入
app.post('/login', (req, res) => {
    const { password } = req.body;
    console.log('收到登入請求，密碼:', password);
    if (password === 'admin123') {
        req.session.isAuthenticated = true;
        console.log('登入成功，設置 session:', req.session);
        res.json({ success: true, message: '登入成功' });
    } else {
        console.log('密碼錯誤');
        res.status(401).json({ success: false, message: '密碼錯誤' });
    }
});

// 路由：登出
app.post('/logout', (req, res) => {
    console.log('收到登出請求，銷毀 session');
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
    console.log('訪問 /admin.html，session 狀態:', req.session.isAuthenticated);
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
        const imagePath = path.join(__dirname, 'uploads', deletedProduct.img);
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
    res.status(404).json({ success: false, message: '找不到請求的資源: ' + req.originalUrl });
});

// 啟動伺服器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`伺服器已啟動，網址: http://localhost:${PORT}`);
});