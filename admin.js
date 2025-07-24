// 登入邏輯
document.getElementById('loginButton').addEventListener('click', async () => {
    const password = document.getElementById('passwordInput').value;
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        const sessionId = response.headers.get('x-session-id');
        if (sessionId) {
            localStorage.setItem('sessionId', sessionId);
            console.log('登入成功，Session ID:', sessionId);
            alert('登入成功');
        } else {
            throw new Error('未獲取到 Session ID');
        }
        const data = await response.json();
        if (!data.success) throw new Error(data.message);
    } catch (err) {
        console.error('登入失敗:', err);
        alert('登入失敗: ' + err.message);
    }
});

// 上傳產品邏輯（已移除價格欄位）
document.getElementById('addProductForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    document.getElementById('message').innerText = '上傳中...';

    const formData = new FormData();
    if (!form.image.files[0]) {
        document.getElementById('message').innerText = '請選擇圖片文件';
        submitBtn.disabled = false;
        return;
    }

    formData.append('image', form.image.files[0]);
    const sessionId = localStorage.getItem('sessionId');
    console.log('上傳請求，Session ID:', sessionId);

    try {
        const imageRes = await fetch('/upload-image', {
            method: 'POST',
            headers: {
                'x-session-id': sessionId
            },
            body: formData
        });
        if (!imageRes.ok) {
            const errorResult = await imageRes.json();
            throw new Error(errorResult.message || `圖片上傳失敗 (${imageRes.status})`);
        }
        const imageResult = await imageRes.json();
        if (!imageResult.filename) {
            throw new Error('圖片上傳失敗：沒有返回文件名');
        }

        const productData = {
            name: form.name.value,
            img: imageResult.filename,
            description: form.description.value
        };

        const productRes = await fetch('/add-product', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-session-id': sessionId
            },
            body: JSON.stringify(productData)
        });
        if (!productRes.ok) {
            const errorResult = await productRes.json();
            throw new Error(errorResult.message || `產品新增失敗 (${productRes.status})`);
        }

        document.getElementById('message').innerText = '產品新增成功！';
        document.getElementById('message').style.color = 'green';
        form.reset();
        document.getElementById('imagePreview').style.display = 'none';
        submitBtn.disabled = false;
        loadProducts();
    } catch (err) {
        console.error('錯誤:', err);
        document.getElementById('message').innerText = '錯誤: ' + err.message;
        document.getElementById('message').style.color = 'red';
        submitBtn.disabled = false;
    }
});

// 圖片預覽邏輯
document.getElementById('addProductForm').image.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = document.getElementById('imagePreview');
            img.src = e.target.result;
            img.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
});

// 載入產品列表（移除價格顯示）
async function loadProducts() {
    try {
        const response = await fetch('/products');
        if (!response.ok) throw new Error('無法載入商品');
        const data = await response.json();
        const productGrid = document.getElementById('productGrid') || document.getElementById('productList');
        productGrid.innerHTML = '';
        data.products.forEach(product => {
            const div = document.createElement('div');
            div.className = 'product-item';
            div.dataset.id = product.id;
            div.innerHTML = `
                <img src="/uploads/${product.img}" alt="${product.name}">
                <p>${product.name}</p>
                <p>${product.description || ''}</p>
                <button onclick="deleteProduct('${product.id}')">刪除</button>
            `;
            productGrid.appendChild(div);
        });
    } catch (err) {
        console.error('載入商品錯誤:', err);
    }
}

// 刪除產品
async function deleteProduct(id) {
    if (!confirm('確定要刪除此商品？')) return;
    const sessionId = localStorage.getItem('sessionId');
    try {
        const response = await fetch(`/products/${id}`, {
            method: 'DELETE',
            headers: {
                'x-session-id': sessionId
            }
        });
        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.message || `刪除失敗 (${response.status})`);
        }
        const data = await response.json();
        document.getElementById('message').innerText = data.message || '商品刪除成功！';
        document.getElementById('message').style.color = 'green';
        loadProducts();
    } catch (err) {
        console.error('刪除錯誤:', err);
        document.getElementById('message').innerText = '錯誤: ' + err.message;
        document.getElementById('message').style.color = 'red';
    }
}

// 初始載入產品列表
loadProducts();
