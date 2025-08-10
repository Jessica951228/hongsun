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
            loadProducts(); // 假設有此函數更新列表
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

    // 載入產品列表
    function loadProducts() {
        fetch('/products')
            .then(response => response.json())
            .then(data => {
                productList.innerHTML = '';
                data.products.forEach(product => {
                    const div = document.createElement('div');
                    div.className = 'product-preview';
                    div.innerHTML = `<img src="/uploads/${product.img}" alt="${product.name}"><span>${product.name}</span>`;
                    productList.appendChild(div);
                });
            });
    }
    loadProducts();
});