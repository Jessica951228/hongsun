function showSection(sectionId, clickedBtn) {
            // 隱藏所有內容區域
            const sections = document.querySelectorAll('.content-section');
            sections.forEach(section => {
                section.style.display = 'none';
            });

            // 顯示選中的區域
            document.getElementById(sectionId).style.display = 'block';

            // 移除所有按鈕的 active 狀態
            const buttons = document.querySelectorAll('.nav-btn');
            buttons.forEach(btn => {
                btn.classList.remove('active');
            });

            // 為點擊的按鈕添加 active 狀態
            clickedBtn.classList.add('active');
        }

        // 顯示按鈕的條件
    window.onscroll = function () {
      const btn = document.getElementById("toTopBtn");
      if (document.documentElement.scrollTop > 300) {
        btn.style.display = "block";
      } else {
        btn.style.display = "none";
      }
    };

    // 點擊按鈕回頂部
    document.getElementById("toTopBtn").onclick = function () {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    };

// 導航按鈕活動狀態
        document.addEventListener('DOMContentLoaded', function() {
            const navBtns = document.querySelectorAll('.nav-btn');
            const currentPage = window.location.pathname.split('/').pop();
            
            navBtns.forEach(btn => {
                if (btn.getAttribute('href') === currentPage) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        });

        // 平滑滾動效果
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });