const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();

// 中間件設定
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 靜態檔案服務
app.use(express.static('./')); // 服務當前目錄的所有檔案
app.use('/uploads', express.static('uploads'));

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
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 限制
  },
  fileFilter: function (req, file, cb) {
    // 只允許圖片檔案
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允許上傳圖片檔案!'), false);
    }
  }
});

// 儲存產品的陣列（實際應用中建議使用資料庫）
let products = [];

// 路由：首頁
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// 路由：圖片上傳
app.post('/upload-image', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: '沒有上傳檔案' 
      });
    }
    
    console.log('圖片上傳成功:', req.file.filename);
    
    res.json({ 
      success: true,
      message: '圖片上傳成功',
      filename: req.file.filename,
      url: `/uploads/${req.file.filename}`
    });
  } catch (error) {
    console.error('圖片上傳錯誤:', error);
    res.status(500).json({ 
      success: false, 
      message: '圖片上傳失敗: ' + error.message 
    });
  }
});

// 路由：新增產品
app.post('/add-product', (req, res) => {
  try {
    console.log('接收到產品資料:', req.body);
    
    const { name, price, img, description } = req.body;
    
    // 驗證必要欄位
    if (!name) {
      return res.status(400).json({ 
        success: false, 
        message: '產品名稱為必填' 
      });
    }
    
    if (!price) {
      return res.status(400).json({ 
        success: false, 
        message: '產品價格為必填' 
      });
    }
    
    if (!img) {
      return res.status(400).json({ 
        success: false, 
        message: '產品圖片為必填' 
      });
    }
    
    // 創建產品物件
    const product = {
      id: Date.now().toString(),
      name: name.trim(),
      price: parseFloat(price),
      img: img,
      description: description ? description.trim() : '',
      createdAt: new Date().toISOString()
    };
    
    // 新增到產品陣列
    products.push(product);
    
    console.log('產品新增成功:', product);
    console.log('目前總產品數量:', products.length);
    
    res.json({ 
      success: true,
      message: '產品新增成功！',
      product: product,
      totalProducts: products.length
    });
    
  } catch (error) {
    console.error('新增產品錯誤:', error);
    res.status(500).json({ 
      success: false, 
      message: '新增產品失敗: ' + error.message 
    });
  }
});

// 路由：取得所有產品
app.get('/products', (req, res) => {
  console.log('取得產品列表，總數:', products.length);
  res.json({
    success: true,
    products: products,
    total: products.length
  });
});

// 路由：根據 ID 取得單一產品
app.get('/products/:id', (req, res) => {
  const productId = req.params.id;
  const product = products.find(p => p.id === productId);
  
  if (!product) {
    return res.status(404).json({ 
      success: false, 
      message: '找不到該產品' 
    });
  }
  
  res.json({
    success: true,
    product: product
  });
});

// 路由：刪除產品
app.delete('/products/:id', (req, res) => {
  const productId = req.params.id;
  const productIndex = products.findIndex(p => p.id === productId);
  
  if (productIndex === -1) {
    return res.status(404).json({ 
      success: false, 
      message: '找不到該產品' 
    });
  }
  
  const deletedProduct = products.splice(productIndex, 1)[0];
  
  // 刪除對應的圖片檔案
  if (deletedProduct.img) {
    const imagePath = path.join(__dirname, 'uploads', deletedProduct.img);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }
  
  res.json({ 
    success: true, 
    message: '產品刪除成功',
    deletedProduct: deletedProduct
  });
});

// 錯誤處理中間件
app.use((error, req, res, next) => {
  console.error('伺服器錯誤:', error);
  res.status(500).json({
    success: false,
    message: '伺服器內部錯誤: ' + error.message
  });
});

// 404 處理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '找不到請求的資源: ' + req.originalUrl
  });
});

// 啟動伺服器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`🚀 伺服器已啟動`);
  console.log(`📍 網址: http://localhost:${PORT}`);
  console.log(`📁 管理後台: http://localhost:${PORT}/admin.html`);
  console.log(`📦 產品 API: http://localhost:${PORT}/products`);
  console.log(`=================================`);
});

// 優雅關閉
process.on('SIGINT', () => {
  console.log('\n正在關閉伺服器...');
  process.exit(0);
});