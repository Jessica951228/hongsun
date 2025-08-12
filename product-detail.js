document.addEventListener('DOMContentLoaded', function () {
  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id'));
  const product = products.find(p => p.id === id);

  const container = document.getElementById('product-detail');

  if (!product) {
    container.innerHTML = "<p>找不到此商品</p>";
    return;
  }

  container.innerHTML = `
    <div class="product-detail-page">
      <img src="${product.img}" alt="${product.name}" class="product-img">
      <h1>${product.name}</h1>
      <div class="product-detail-text">${product.detailedDescription}</div>
      <div class="product-info">
        <p><strong>最低訂購：</strong>${product.minOrder}</p>
        <p><strong>製作時間：</strong>${product.productionTime}</p>
      </div>
      <a href="${product.shopeeLink}" class="btn" target="_blank">前往蝦皮購買</a>
    </div>
  `;
});