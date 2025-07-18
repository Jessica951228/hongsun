 const products = [
    {
      id: 1,
      name: "行李箱帶",
      img: "luggage-strap.png",
      description: "全彩客製化訂製專屬自己的行李束帶，與別人與眾不同的設計，出差旅行，提高行李箱辦識度，透過熱昇華數位印刷，顏色鮮艷&細緻度高，長期使用不易褪色唷",
      detailedDescription: `
        <h2>行李箱帶 - 專業客製化服務</h2>
        <p>讓您的行李箱在機場轉盤上一眼就能辨識！我們的全彩客製化行李束帶，採用最先進的熱昇華數位印刷技術，為您打造獨一無二的專屬設計。</p>
        
        <h3>產品特色</h3>
        <ul>
          <li>全彩客製化設計，可印製照片、文字、Logo</li>
          <li>熱昇華數位印刷，顏色鮮艷持久不褪色</li>
          <li>高品質織帶材質，耐用且舒適</li>
          <li>快速扣具設計，方便使用</li>
          <li>適用於各種尺寸行李箱</li>
        </ul>
        
        <h3>規格說明</h3>
        <ul>
          <li>寬度：5cm</li>
          <li>長度：可調整最長至200cm</li>
          <li>材質：聚酯纖維織帶</li>
          <li>扣具：高強度塑膠快扣</li>
          <li>印刷：熱昇華數位印刷</li>
        </ul>
        
        <h3>使用場合</h3>
        <ul>
          <li>出差旅行必備</li>
          <li>企業贈品</li>
          <li>活動紀念品</li>
          <li>個人收藏</li>
        </ul>
        
        <h3>訂購說明</h3>
        <p>最低訂購數量：10條起訂<br>
        製作時間：7-10個工作天<br>
        支援格式：AI、PNG、JPG檔案</p>
      `,
      price: "NT$ 280起",
      minOrder: "10條起訂",
      productionTime: "7-10個工作天",
      shopeeLink: "https://reurl.cc/bW17ol"
    },
    {
      id: 2,
      name: "機車套",
      img: "moto.png",
      description: "防水防塵機車套，保護您的愛車免受風吹雨打",
      detailedDescription: `
        <h2>機車套 - 全方位保護</h2>
        <p>為您的機車提供最完善的保護，採用防水防塵材質製作，有效阻擋雨水、灰塵及紫外線，延長機車使用壽命。</p>
        
        <h3>產品特色</h3>
        <ul>
          <li>防水防塵設計</li>
          <li>抗UV材質，防止褪色</li>
          <li>透氣不悶熱</li>
          <li>多尺寸可選</li>
          <li>收納方便</li>
        </ul>
        
        <h3>規格說明</h3>
        <ul>
          <li>材質：210D牛津布</li>
          <li>防水係數：3000mm</li>
          <li>尺寸：多種尺寸可選</li>
          <li>顏色：黑色、銀色可選</li>
        </ul>
      `,
      price: "NT$ 580起",
      minOrder: "5件起訂",
      productionTime: "5-7個工作天",
      shopeeLink: "https://reurl.cc/bW17ol"
    },
    {
      id: 3,
      name: "識別證帶",
      img: "lanyard.png",
      description: "多功能識別證帶，適用於各種場合",
      detailedDescription: `
        <h2>識別證帶 - 專業識別解決方案</h2>
        <p>高品質識別證帶，適用於企業、學校、活動等各種場合。可客製化印製Logo、文字，提升企業形象。</p>
        
        <h3>產品特色</h3>
        <ul>
          <li>多種扣具選擇</li>
          <li>可客製化印刷</li>
          <li>舒適耐用</li>
          <li>多種寬度可選</li>
          <li>環保材質</li>
        </ul>
        
        <h3>規格說明</h3>
        <ul>
          <li>寬度：1.5cm / 2cm / 2.5cm</li>
          <li>長度：90cm標準長度</li>
          <li>材質：聚酯纖維</li>
          <li>扣具：塑膠扣、金屬扣可選</li>
        </ul>
      `,
      price: "NT$ 25起",
      minOrder: "100條起訂",
      productionTime: "7-10個工作天",
      shopeeLink: "https://reurl.cc/QY84kq"
    },
    {
      id: 4,
      name: "袖套",
      img: "arm-cover.png",
      description: "防曬袖套，夏日必備配件",
      detailedDescription: `
        <h2>袖套 - 夏日防曬首選</h2>
        <p>採用涼感材質製作，提供優異的防曬效果，同時保持透氣舒適。適合戶外工作、運動、騎車使用。</p>
        
        <h3>產品特色</h3>
        <ul>
          <li>UPF50+防曬係數</li>
          <li>涼感材質</li>
          <li>彈性佳，不緊繃</li>
          <li>快乾透氣</li>
          <li>可機洗</li>
        </ul>
        
        <h3>規格說明</h3>
        <ul>
          <li>材質：涼感聚酯纖維</li>
          <li>尺寸：均碼（彈性設計）</li>
          <li>顏色：多色可選</li>
          <li>防曬係數：UPF50+</li>
        </ul>
      `,
      price: "NT$ 180起",
      minOrder: "20雙起訂",
      productionTime: "5-7個工作天",
      shopeeLink: "https://reurl.cc/3KdOE9"
    },
    {
      id: 5,
      name: "腕帶",
      img: "wristband.png",
      description: "運動腕帶，吸汗透氣",
      detailedDescription: `
        <h2>腕帶 - 運動必備配件</h2>
        <p>專為運動設計的腕帶，具有優異的吸汗效果，讓您在運動時保持乾爽舒適。可客製化印製團隊Logo或個人圖案。</p>
        
        <h3>產品特色</h3>
        <ul>
          <li>吸汗快乾</li>
          <li>彈性佳</li>
          <li>可客製化印刷</li>
          <li>耐洗耐用</li>
          <li>多色可選</li>
        </ul>
        
        <h3>規格說明</h3>
        <ul>
          <li>材質：毛巾布</li>
          <li>尺寸：8cm x 8cm</li>
          <li>厚度：適中</li>
          <li>顏色：多色可選</li>
        </ul>
      `,
      price: "NT$ 80起",
      minOrder: "50個起訂",
      productionTime: "7-10個工作天",
      shopeeLink: "https://reurl.cc/knGler"
    }
  ];  

