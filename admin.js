document.getElementById('addProductForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData();
  
  // 檢查是否選擇了圖片文件
  if (!form.image.files[0]) {
    document.getElementById('message').innerText = '請選擇圖片文件';
    return;
  }
  
  // 先上傳圖片
  formData.append('image', form.image.files[0]);
  
  try {
    // 上傳圖片
    const imageRes = await fetch('/upload-image', {
      method: 'POST',
      body: formData
    });
    
    // 先檢查響應狀態，再解析 JSON
    if (!imageRes.ok) {
      // 如果響應不成功，嘗試解析錯誤消息
      let errorMessage = `HTTP ${imageRes.status}`;
      try {
        const errorResult = await imageRes.json();
        errorMessage = errorResult.message || errorMessage;
      } catch (jsonError) {
        // 如果無法解析 JSON，使用默認錯誤消息
        errorMessage = `圖片上傳失敗 (${imageRes.status})`;
      }
      throw new Error(errorMessage);
    }
    
    // 響應成功時才解析 JSON
    const imageResult = await imageRes.json();
    
    // 檢查上傳結果
    if (!imageResult.filename) {
      throw new Error('圖片上傳失敗：沒有返回文件名');
    }
    
    // 圖片上傳成功後，新增產品
    const productData = {
      name: form.name.value,
      price: form.price.value,
      img: imageResult.filename, // 使用上傳後的檔名
      description: form.description.value
    };

    const productRes = await fetch('/add-product', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(productData)
    });
    
    // 同樣先檢查響應狀態
    if (!productRes.ok) {
      let errorMessage = `HTTP ${productRes.status}`;
      try {
        const errorResult = await productRes.json();
        errorMessage = errorResult.message || errorMessage;
      } catch (jsonError) {
        errorMessage = `產品新增失敗 (${productRes.status})`;
      }
      throw new Error(errorMessage);
    }

    const productResult = await productRes.json();
    
    // 顯示成功消息
    document.getElementById('message').innerText = '產品新增成功！';
    document.getElementById('message').style.color = 'green';
    form.reset();
    
  } catch (err) {
    console.error('詳細錯誤:', err);
    document.getElementById('message').innerText = '錯誤: ' + err.message;
    document.getElementById('message').style.color = 'red';
  }
});