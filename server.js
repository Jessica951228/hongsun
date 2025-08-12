const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? 'https://hongsunweb.onrender.com' : 'http://localhost:3000'),
    credentials: true,
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'x-session-id']
}));

// 靜態檔案服務
app.use(express.static(__dirname));

// 動態路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index5.html'));
});

// 處理 favicon 請求，避免 404 日誌污染
app.get('/favicon.ico', (req, res) => res.status(204).end());

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

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] 伺服器已啟動，網址: http://localhost:${PORT}`);
});