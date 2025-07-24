const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const session = require('express-session');
const Redis = require('ioredis');
const RedisStore = require('connect-redis').default;

const app = express();

// Redis 連接設定
let redisClient;
let redisConnected = false;

try {
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000
    });

    redisClient.on('connect', () => {
        console.log(`[${new Date().toISOString()}] Redis 連接成功`);
        redisConnected = true;
    });

    redisClient.on('error', (err) => {
        console.error(`[${new Date().toISOString()}] Redis 連接錯誤: ${err.message}`);
        redisConnected = false;
    });
} catch (error) {
    console.error(`[${new Date().toISOString()}] Redis 初始化失敗: ${error.message}`);
    redisConnected = false;
}

// CORS 設定
app.use(cors({
    origin: process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? 'https://hongsunweb.onrender.com' : 'http://localhost:3000'),
    credentials: true,
    methods: ['GET', 'POST', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 解析 JSON 和 URL 編碼數據
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session 設定
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'hongsun-secret-2025-secure',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 小時
        sameSite: 'lax'
    }
};

// 如果 Redis 可用，使用 Redis store，否則使用內存 store
if (redisConnected && redisClient) {
    sessionConfig.store = new RedisStore({ client: redisClient });
    console.log(`[${new Date().toISOString()}] 使用 Redis Session Store`);
} else {
    console.log(`[${new Date().toISOString()}] 使用內存 Session Store (Redis 不可用)`);
}

app.use(session(sessionConfig));

// 請求日誌中間件
app.use((req, res, next) => {
    const bodyLog = req.method === 'POST' ? JSON.stringify(req.body) : '';
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} | Session: ${req.sessionID} | Auth: ${!!req.session?.isAuthenticated} | Body: ${bodyLog}`);
    next();
});

// 確保 uploads 資料夾存在
const uploadsDir = path.join(__dirname, 'Uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`[${new Date().toISOString()}] 創建 Uploads 資料夾`);
}

// Multer 設定 - 圖片上傳
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
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('只允許上傳圖片檔案'), false);
        }
    }
});

// 產品數據管理
const productsFile = path.join(__dirname, 'products.json');
let products = [];

// 載入產品數據
function loadProducts() {
    try {
        if (fs.existsSync(productsFile)) {
            const data = fs.readFileSync(productsFile, 'utf-8');
            const parsed = JSON.parse(data);
            products = Array.isArray(parsed) ? parsed : [];
            console.log(`[${new Date().toISOString()}] 成功載入 products.json，商品數: ${products.length}`);
        } else {
            products = [];
            saveProducts();
            console.log(`[${new Date().toISOString()}] 創建新的 products.json`);
        }
    } catch (err) {
        console.error(`[${new Date().toISOString()}] 載入 products.json 失敗: ${err.message}`);
        products = [];
        saveProducts();
    }
}

// 儲存產品數據
function saveProducts() {
    try {
        fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
        console.log(`[${new Date().toISOString()}] 成功儲存 products.json，商品數: ${products.length}`);
    } catch (err) {
        console.error(`[${new Date().toISOString()}] 儲存 products.json 失敗: ${err.message}`);
    }
}

// 初始化產品數據
loadProducts();

// 身份驗證中間件
function isAuthenticated(req, res, next) {
    console.log(`[${new Date().toISOString()}] 驗證訪問: ${req.path} | Session ID: ${req.sessionID} | Auth: ${!!req.session?.isAuthenticated}`);
    
    if (req.session && req.session.isAuthenticated) {
        return next();
    }
    
    // 對於 API 請求返回 JSON 錯誤
    if (req.path.startsWith('/api/') || req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
        return res.status(401).json({ success: false, message: '未授權訪問，請先登入' });
    }
    
    // 對於頁面請求重定向到登入頁
    console.log(`[${new Date().toISOString()}] 未登入，重定向到登入頁`);
    res.redirect('/login.html');
}

// ===== API 路由 =====

// 檢查登入狀態
app.get('/api/check-auth', (req, res) => {
    const isAuth = !!(req.session && req.session.isAuthenticated);
    console.log(`[${new Date().toISOString()}] 檢查登入狀態: ${isAuth}`);
    res.json({ success: true, isAuthenticated: isAuth });
});

// 登入
app.post('/api/login', (req, res) => {
    try {
        const { password } = req.body;
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
        
        console.log(`[${new Date().toISOString()}] 登入嘗試，密碼比對中...`);
        
        if (!password) {
            return res.status(400).json({ success: false, message: '請輸入密碼' });
        }
        
        if (password === adminPassword) {
            req.session.isAuthenticated = true;
            console.log(`[${new Date().toISOString()}] 登入成功 | Session ID: ${req.sessionID}`);
            res.json({ success: true, message: '登入成功' });
        } else {
            console.log(`[${new Date().toISOString()}] 密碼錯誤`);
            res.status(401).json({ success: false, message: '密碼錯誤' });
        }
    } catch (error) {
        console.error(`[${new Date().toISOString()}] 登入錯誤: ${error.message}`);
        res.status(500).json({ success: false, message: '登入過程發生錯誤' });
    }
});

// 登出
app.post('/api/logout', (req, res) => {
    console.log(`[${new Date().toISOString()}] 登出請求`);
    req.session.destroy((err) => {
        if (err) {
            console.error(`[${new Date().toISOString()}] 登出錯誤: ${err.message}`);
            return res.status(500).json({ success: false, message: '登出失敗' });
        }
        res.json({ success: true, message: '登出成功' });
    });
});

// 獲取所有產品
app.get('/api/products', (req, res) => {
    try {
        console.log(`[${new Date().toISOString()}] 獲取產品列表，總數: ${products.length}`);
        res.json({ 
            success: true, 
            products: products, 
            total: products.length 
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] 獲取產品列表錯誤: ${error.message}`);
        res.status(500).json({ success: false, message: '獲取產品列表失敗' });
    }
});

// 獲取單個產品
app.get('/api/products/:id', (req, res) => {
    try {
        const productId = req.params.id;
        const product = products.find(p => p.id === productId);
        
        if (!product) {
            return res.status(404).json({ success: false, message: '找不到該產品' });
        }
        
        console.log(`[${new Date().toISOString()}] 獲取產品: ${product.name}`);
        res.json({ success: true, product: product });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] 獲取產品錯誤: ${error.message}`);
        res.status(500).json({ success: false, message: '獲取產品失敗' });
    }
});

// 新增產品
app.post('/api/add-product', isAuthenticated, (req, res) => {
    try {
        const { name, price, img, description } = req.body;
        
        // 驗證必填欄位
        if (!name || !price || !img) {
            return res.status(400).json({ 
                success: false, 
                message: '產品名稱、價格和圖片為必填欄位' 
            });
        }
        
        // 驗證價格格式
        const numPrice = parseFloat(price);
        if (isNaN(numPrice) || numPrice < 0) {
            return res.status(400).json({ 
                success: false, 
                message: '價格必須為有效的數字' 
            });
        }
        
        // 創建新產品
        const product = {
            id: Date.now().toString(),
            name: name.trim(),
            price: numPrice,
            img: img,
            description: description ? description.trim() : '',
            createdAt: new Date().toISOString()
        };
        
        // 確保 products 是陣列
        if (!Array.isArray(products)) {
            console.error(`[${new Date().toISOString()}] products 不是陣列，重新初始化`);
            products = [];
        }
        
        products.push(product);
        saveProducts();
        
        console.log(`[${new Date().toISOString()}] 新增產品成功: ${product.name}`);
        res.json({ 
            success: true, 
            message: '產品新增成功！', 
            product: product 
        });
        
    } catch (error) {
        console.error(`[${new Date().toISOString()}] 新增產品錯誤: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            message: '新增產品失敗: ' + error.message 
        });
    }
});

// 上傳產品 (別名路由)
app.post('/api/upload-product', isAuthenticated, (req, res) => {
    // 直接調用 add-product 的邏輯
    const addProductHandler = app._router.stack.find(layer => 
        layer.route && layer.route.path === '/api/add-product' && layer.route.methods.post
    );
    
    if (addProductHandler) {
        addProductHandler.route.stack[1].handle(req, res); // [0] 是 isAuthenticated, [1] 是實際處理函數
    } else {
        // 備用邏輯，直接複製 add-product 的代碼
        try {
            const { name, price, img, description } = req.body;
            
            if (!name || !price || !img) {
                return res.status(400).json({ 
                    success: false, 
                    message: '產品名稱、價格和圖片為必填欄位' 
                });
            }
            
            const numPrice = parseFloat(price);
            if (isNaN(numPrice) || numPrice < 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: '價格必須為有效的數字' 
                });
            }
            
            const product = {
                id: Date.now().toString(),
                name: name.trim(),
                price: numPrice,
                img: img,
                description: description ? description.trim() : '',
                createdAt: new Date().toISOString()
            };
            
            if (!Array.isArray(products)) {
                products = [];
            }
            
            products.push(product);
            saveProducts();
            
            console.log(`[${new Date().toISOString()}] 上傳產品成功: ${product.name}`);
            res.json({ 
                success: true, 
                message: '產品上傳成功！', 
                product: product 
            });
            
        } catch (error) {
            console.error(`[${new Date().toISOString()}] 上傳產品錯誤: ${error.message}`);
            res.status(500).json({ 
                success: false, 
                message: '上傳產品失敗: ' + error.message 
            });
        }
    }
});

// 刪除產品
app.delete('/api/products/:id', isAuthenticated, (req, res) => {
    try {
        const productId = req.params.id;
        const productIndex = products.findIndex(p => p.id === productId);
        
        if (productIndex === -1) {
            return res.status(404).json({ success: false, message: '找不到該產品' });
        }
        
        const deletedProduct = products.splice(productIndex, 1)[0];
        saveProducts();
        
        // 刪除對應的圖片檔案
        if (deletedProduct.img) {
            const imagePath = path.join(__dirname, 'Uploads', deletedProduct.img);
            if (fs.existsSync(imagePath)) {
                try {
                    fs.unlinkSync(imagePath);
                    console.log(`[${new Date().toISOString()}] 刪除圖片檔案: ${deletedProduct.img}`);
                } catch (err) {
                    console.error(`[${new Date().toISOString()}] 刪除圖片檔案失敗: ${err.message}`);
                }
            }
        }
        
        console.log(`[${new Date().toISOString()}] 刪除產品成功: ${deletedProduct.name}`);
        res.json({ 
            success: true, 
            message: '產品刪除成功', 
            deletedProduct: deletedProduct 
        });
        
    } catch (error) {
        console.error(`[${new Date().toISOString()}] 刪除產品錯誤: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            message: '刪除產品失敗: ' + error.message 
        });
    }
});

// 上傳圖片
app.post('/api/upload-image', isAuthenticated, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: '沒有選擇檔案' });
        }
        
        console.log(`[${new Date().toISOString()}] 圖片上傳成功: ${req.file.filename}`);
        res.json({ 
            success: true, 
            message: '圖片上傳成功', 
            filename: req.file.filename,
            url: `/uploads/${req.file.filename}`
        });
        
    } catch (error) {
        console.error(`[${new Date().toISOString()}] 圖片上傳錯誤: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            message: '圖片上傳失敗: ' + error.message 
        });
    }
});

// ===== 靜態檔案服務 =====
app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));
app.use(express.static(path.join(__dirname, '.')));

// ===== 頁面路由 =====

// 首頁
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index5.html'));
});

// 管理頁面 (需要登入)
app.get('/admin.html', isAuthenticated, (req, res) => {
    console.log(`[${new Date().toISOString()}] 訪問管理頁面`);
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// 登入頁面
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// ===== 錯誤處理中間件 =====

// Multer 錯誤處理
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        console.error(`[${new Date().toISOString()}] Multer 錯誤: ${error.message}`);
        
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, message: '檔案大小超過限制 (10MB)' });
        }
        
        return res.status(400).json({ success: false, message: '檔案上傳錯誤: ' + error.message });
    }
    
    if (error.message === '只允許上傳圖片檔案') {
        return res.status(400).json({ success: false, message: error.message });
    }
    
    console.error(`[${new Date().toISOString()}] 伺服器錯誤: ${error.message}`);
    res.status(500).json({ success: false, message: '伺服器內部錯誤: ' + error.message });
});

// 404 處理
app.use((req, res) => {
    console.log(`[${new Date().toISOString()}] 404 錯誤: ${req.method} ${req.path}`);
    
    // API 請求返回 JSON
    if (req.path.startsWith('/api/') || req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
        return res.status(404).json({ success: false, message: 'API 端點不存在' });
    }
    
    // 其他請求重定向到首頁或返回 404 頁面
    res.status(404).sendFile(path.join(__dirname, 'index5.html'));
});

// ===== 啟動伺服器 =====
const PORT = process.env.PORT || 10000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[${new Date().toISOString()}] 伺服器已啟動`);
    console.log(`[${new Date().toISOString()}] 本地網址: http://localhost:${PORT}`);
    console.log(`[${new Date().toISOString()}] 環境: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[${new Date().toISOString()}] Redis 狀態: ${redisConnected ? '已連接' : '未連接 (使用內存存儲)'}`);
});