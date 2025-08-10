document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('addProductForm');
    const message = document.getElementById('message');
    const productList = document.getElementById('productList');
    const imagePreview = document.getElementById('imagePreview');
    const submitBtn = document.getElementById('submitBtn');

    // 表單提交邏輯（新增產品）
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        message.innerText = '上傳中...';

        const formData = new FormData(form);
        const name = formData.get('name');
        const description = formData.get('description');

        try {
            // 上傳圖片
            const uploadResponse = await fetch('/upload-image', {
                method: 'POST',
                body: formData
            });
            const uploadData = await uploadResponse.json();
            if (!uploadData.success) {
                throw new Error(uploadData.message || '圖片上傳失敗');
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
            if (!addData.success) {
                throw new Error(addData.message || '產品新增失敗');
            }

            message.innerText = '產品新增成功！';
            message.style.color = 'green';
            form.reset();
            imagePreview.style.display = 'none';
            loadProducts(); // 刷新產品列表
        } catch (err) {
            console.error('錯誤:', err);
            message.innerText = '錯誤: ' + err.message;
            message.style.color = 'red';
        } finally {
            submitBtn.disabled = false;
        }
    });

    // 圖片預覽邏輯
    form.querySelector('input[name="image"]').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                imagePreview.src = e.target.result;
                imagePreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    // 載入產品列表並添加刪除按鈕
    async function loadProducts() {
        try {
            const response = await fetch('/products');
            if (!response.ok) throw new Error('無法載入商品');
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
            console.error('載入商品錯誤:', err);
            message.innerText = '載入產品失敗: ' + err.message;
            message.style.color = 'red';
        }
    }

    // 刪除產品
    async function deleteProduct(id) {
        if (confirm('確定要刪除此產品嗎？')) {
            try {
                const response = await fetch(`/products/${id}`, { method: 'DELETE' });
                if (!response.ok) throw new Error('刪除失敗');
                loadProducts(); // 刷新列表
                message.innerText = '產品刪除成功！';
                message.style.color = 'green';
            } catch (err) {
                console.error('刪除錯誤:', err);
                message.innerText = '刪除失敗: ' + err.message;
                message.style.color = 'red';
            }
        }
    }

    // 初始載入產品列表
    loadProducts();
});