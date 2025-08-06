document.addEventListener('DOMContentLoaded', async function () {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const container = document.getElementById('product-detail');

    if (!container) {
        console.error('找不到 product-detail 容器');
        return;
    }

    if (!id) {
        console.error('無效的產品 ID:', id);
        container.innerHTML = '<p>無效的產品 ID，請檢查鏈接。</p>';
        return;
    }

    try {
        const response = await fetch(`/products/${id}`);
        if (!response.ok) throw new Error(`找不到此商品 (狀態: ${response.status})`);
        const product = await response.json();
        console.log('產品數據:', product);

        const imgSrc = product.img ? `/uploads/${product.img}` : '/placeholder.jpg';
        container.innerHTML = `
            <div class="product-detail-page">
                <img src="${imgSrc}" alt="${product.name || '無名稱產品'}" class="product-img">
                <h1>${product.name || '無名稱'}</h1>
                <div class="product-detail-text">${product.description || ''}</div>
                <div class="product-info">
                    <p><strong>價格：</strong>${product.price || '未提供'} 元</p>
                    <p><strong>最低訂購：</strong>${product.minOrder || '未提供'}</p>
                    <p><strong>製作時間：</strong>${product.productionTime || '未提供'}</p>
                </div>
                ${product.shopeeLink ? `<a href="${product.shopeeLink}" class="btn" target="_blank">前往蝦皮購買</a>` : ''}
            </div>
        `;
    } catch (err) {
        console.error('錯誤:', err);
        container.innerHTML = `<p>找不到此商品: ${err.message}</p>`;
    }
});