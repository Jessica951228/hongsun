// 登入邏輯（新增）
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
            localStorage.setItem('sessionId', sessionId); // 儲存 Session ID
            alert('登入成功');
        }
        const data = await response.json();
        if (!data.success) throw new Error(data.message);
    } catch (err) {
        console.error('登入失敗:', err);
        alert('登入失敗: ' + err.message);
    }
});

// 上傳邏輯（修正）
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

    try {
        const imageRes = await fetch('/upload-image', {
            method: 'POST',
            headers: {
                'x-session-id': localStorage.getItem('sessionId'), // 添加 Session ID
                'Content-Type': 'multipart/form-data'
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
            price: form.price.value,
            img: imageResult.filename,
            description: form.description.value
        };

        const productRes = await fetch('/add-product', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-session-id': localStorage.getItem('sessionId') // 添加 Session ID
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
        document.getElementById('message').innerText = '錯誤: ' + (err.message.includes('push is not a function') ? '伺服器資料格式錯誤，請聯繫管理員' : err.message);
        document.getElementById('message').style.color = 'red';
        submitBtn.disabled = false;
    }
});

// 圖片預覽邏輯（未變更）
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

// 載入產品列表（未變更）
async function loadProducts() {
    try {
        const response = await fetch('/products');
        if (!response.ok) throw new Error('無法載入商品');
        const data = await response.json();
        const productList = document.getElementById('productList');
        productList.innerHTML = '';
        data.products.forEach(product => {
            const div = document.createElement('div');
            div.className = 'product-preview';
            div.innerHTML = `
                <img src="/uploads/${product.img}" alt="${product.name}">
                <div>
                    <p><strong>${product.name}</strong></p>
                    <p>價格: ${product.price} 元</p>
                    <p>${product.description}</p>
                    <button onclick="deleteProduct('${product.id}')">刪除</button>
                </div>
            `;
            productList.appendChild(div);
        });
    } catch (err) {
        console.error('載入商品錯誤:', err);
    }
}

// 刪除產品（修正，添加 Session ID）
async function deleteProduct(id) {
    if (!confirm('確定要刪除此商品？')) return;
    try {
        const response = await fetch(`/products/${id}`, {
            method: 'DELETE',
            headers: {
                'x-session-id': localStorage.getItem('sessionId') // 添加 Session ID
            }
        });
        if (!response.ok) throw new Error('刪除失敗');
        document.getElementById('message').innerText = '商品刪除成功！';
        document.getElementById('message').style.color = 'green';
        loadProducts();
    } catch (err) {
        document.getElementById('message').innerText = '錯誤: ' + err.message;
        document.getElementById('message').style.color = 'red';
    }
}

loadProducts();