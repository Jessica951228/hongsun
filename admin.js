document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('addProductForm');
    const message = document.getElementById('message');
    const productList = document.getElementById('productList');
    const imagePreview = document.getElementById('imagePreview');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const name = formData.get('name');
        const description = formData.get('description');

        // 上傳圖片
        const uploadResponse = await fetch('/upload-image', {
            method: 'POST',
            body: formData
        });
        const uploadData = await uploadResponse.json();
        if (!uploadData.success) {
            message.textContent = uploadData.message;
            return;
        }

        // 新增產品
        const addResponse = await fetch('/add-product', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                img: uploadData.filename,
                description
            })
        });
        const addData = await addResponse.json();
        message.textContent = addData.message;

        if (addData.success) {
            loadProducts(); // 刷新產品列表
        }
    });

    // 圖片預覽
    form.querySelector('input[name="image"]').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            imagePreview.src = URL.createObjectURL(file);
            imagePreview.style.display = 'block';
        }
    });

    // 載入產品列表並添加刪除按鈕
    async function loadProducts() {
        try {
            const response = await fetch('/products');
            if (!response.ok) throw new Error(`無法載入產品: ${response.status}`);
            const data = await response.json();
            productList.innerHTML = '';
            data.products.forEach(product => {
                const div = document.createElement('div');
                div.className = 'product-preview';
                const imgSrc = product.img ? `/uploads/${product.img}` : '/placeholder.jpg';
                div.innerHTML = `
                    <img src="${imgSrc}" alt="${product.name}">
                    <span>${product.name}</span>
                    <button class="delete-btn" onclick="deleteProduct('${product.id}')">移除</button>
                `;
                productList.appendChild(div);
            });
        } catch (err) {
            console.error('載入產品錯誤:', err);
        }
    }

    // 刪除產品
    async function deleteProduct(id) {
        try {
            const response = await fetch(`/products/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error(`刪除失敗: ${response.status}`);
            loadProducts(); // 刷新列表
            message.textContent = '產品刪除成功！';
        } catch (err) {
            console.error('刪除錯誤:', err);
            message.textContent = '刪除失敗: ' + err.message;
        }
    }

    loadProducts(); // 初始載入
});