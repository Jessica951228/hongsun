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