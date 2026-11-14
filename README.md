# 模型含二工｜3D 網頁瀏覽

把本資料夾的所有內容（包含 .nojekyll）放到 GitHub 儲存庫根目錄。在 Settings → Pages 選擇 Deploy from a branch、主要分支及 /(root)，再開啟 Pages 提供的網址。不需要建置，也不依賴 CDN。

本機預覽：在本資料夾執行 `python -m http.server 8000`，開啟 http://localhost:8000/。瀏覽器需要透過 HTTP 載入模型。

樓層按鈕可單獨顯示該層，「全部樓層」恢復整棟。透明牆體開關控制牆面；另有俯視及重設視角。模型保留原檔可見面與貼圖；不含 SketchUp 場景、施工線、標註及 Enscape 燈光。
