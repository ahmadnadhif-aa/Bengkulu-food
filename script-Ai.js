// script-Ai.js
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
let API_KEY = localStorage.getItem('openrouter_api_key') || '';

// Jika tidak ada API key, minta input
if (!API_KEY) {
    // Tampilkan tombol input API key
    const apiButton = document.createElement('button');
    apiButton.id = 'apiKeyButton';
    apiButton.innerHTML = '🔑 Input API Key';
    apiButton.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff6b35;
        color: white;
        border: none;
        padding: 10px 15px;
        border-radius: 20px;
        font-size: 14px;
        cursor: pointer;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(255, 107, 53, 0.4);
        animation: pulse 2s infinite;
    `;
    
    apiButton.onclick = function() {
        const key = prompt('Masukkan API Key OpenRouter:\n\nDapatkan gratis di: https://openrouter.ai/keys\n\nFormat: sk-or-v1-xxxxxxxx');
        if (key && key.trim()) {
            localStorage.setItem('openrouter_api_key', key.trim());
            API_KEY = key.trim();
            this.remove();
            alert('✅ API Key tersimpan! Silakan refresh halaman.');
        }
    };
    
    // Tambahkan style animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 0.8; }
            100% { transform: scale(1); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    document.addEventListener('DOMContentLoaded', function() {
        document.body.appendChild(apiButton);
        
        // Update tagline
        const tagline = document.querySelector('.tag');
        if (tagline) {
            tagline.innerHTML = '🔑 Klik tombol di kanan atas untuk input API Key';
            tagline.style.color = '#ff6b35';
        }
    });
}

// Daftar model dengan urutan prioritas
const MODEL_PRIORITY_LIST = [
  {
    id: "mistralai/devstral-2512:free",
    name: "Mistral DevStral",
    provider: "Mistral AI"
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Llama 3.3 70B",
    provider: "Meta"
  },
  {
    id: "meta-llama/llama-3.2-3b-instruct:free",
    name: "Llama 3.2 3B",
    provider: "Meta"
  },
  {
    id: "amazon/nova-2-lite-v1:free",
    name: "Amazon 2",
    provider: "Alibaba"
  },
  {
    id: "openai/gpt-oss-120b:free",
    name: "GPT OSS 120B",
    provider: "OpenAI"
  }
];

// Variabel untuk melacak model yang sedang aktif
let currentModelIndex = 0;
let failedModels = new Set(); // Model yang gagal untuk session ini
const MAX_RETRIES = 2; // Maksimal percobaan ganti model

document.addEventListener('DOMContentLoaded', function() {
  // TAMBAHKAN CHECK API KEY DI SINI ↓
  if (!API_KEY) {
    // Sembunyikan chat form
    const chatForm = document.getElementById('chatForm');
    const chatWindow = document.getElementById('chatWindow');
    
    if (chatForm) chatForm.style.display = 'none';
    if (chatWindow) {
      chatWindow.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
          <h3 style="color: #ff6b35;">🔑 API Key Diperlukan</h3>
          <p>Silakan klik tombol di kanan atas untuk input API Key</p>
          <p><small>Atau refresh halaman setelah input key</small></p>
        </div>
      `;
    }
    return; // Jangan lanjutkan inisialisasi chat
  }
  
  const chatForm = document.getElementById('chatForm');
  const userInput = document.getElementById('userInput');
  const sendBtn = document.getElementById('sendBtn');
  const chatWindow = document.getElementById('chatWindow');
  
  let chatHistory = [];
  let isProcessing = false;
  
  // Tampilkan info model di UI (tanpa teks "menggunakan")
  function updateModelInfo() {
    const currentModel = MODEL_PRIORITY_LIST[currentModelIndex];
    
    // Cari atau buat elemen info model
    let modelInfo = document.querySelector('.model-info');
    if (!modelInfo) {
      modelInfo = document.createElement('div');
      modelInfo.className = 'model-info';
      // Masukkan setelah tagline
      const tagline = document.querySelector('.tag');
      if (tagline) {
        tagline.insertAdjacentElement('afterend', modelInfo);
      }
    }
    
    modelInfo.innerHTML = `
      <span class="model-status">🟢</span>
      <span class="model-name">${currentModel.name}</span>
    `;
  }
  
  // Setup awal
  function setupSendButton() {
    sendBtn.innerHTML = '<span class="btn-text">Kirim</span>';
    updateModelInfo();
  }
  
  setupSendButton();
    addResetKeyButton();
    function addResetKeyButton() {
  const footer = document.querySelector('.footer-main');
  if (footer && !footer.querySelector('.reset-key-btn')) {
    const resetBtn = document.createElement('button');
    resetBtn.className = 'reset-key-btn';
    resetBtn.innerHTML = '🔄 Reset Key';
    resetBtn.style.cssText = `
      background: #6c757d;
      color: white;
      border: none;
      padding: 5px 10px;
      border-radius: 15px;
      font-size: 12px;
      cursor: pointer;
      margin-left: 10px;
    `;
    
    resetBtn.onclick = function() {
      if (confirm('Hapus API Key? Anda perlu input key baru setelah reset.')) {
        localStorage.removeItem('openrouter_api_key');
        alert('✅ Key dihapus. Halaman akan refresh...');
        location.reload();
      }
    };
    
    footer.appendChild(resetBtn);
  }
}
  function addMessage(text, isUser = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `msg ${isUser ? 'user' : 'ai'}`;
    messageDiv.textContent = text;
    
    const time = new Date().toLocaleTimeString('id-ID', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    
    const container = document.createElement('div');
    container.className = 'message-container';
    
    container.appendChild(messageDiv);
    
    const timeSpan = document.createElement('div');
    timeSpan.className = 'msg-time';
    timeSpan.textContent = time;
    container.appendChild(timeSpan);
    
    chatWindow.appendChild(container);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    messageDiv.style.animation = 'fadeIn 0.3s ease';
  }
  
  // Fungsi untuk mencoba model berikutnya
  function switchToNextModel() {
    failedModels.add(MODEL_PRIORITY_LIST[currentModelIndex].id);
    
    // Cari model berikutnya yang belum gagal
    for (let i = 0; i < MODEL_PRIORITY_LIST.length; i++) {
      const nextIndex = (currentModelIndex + i + 1) % MODEL_PRIORITY_LIST.length;
      if (!failedModels.has(MODEL_PRIORITY_LIST[nextIndex].id)) {
        currentModelIndex = nextIndex;
        console.log(`Beralih ke model: ${MODEL_PRIORITY_LIST[currentModelIndex].name}`);
        
        // Update UI tanpa pesan beralih
        updateModelInfo();
        
        return true;
      }
    }
    
    return false; // Semua model sudah dicoba
  }
  
  // Fungsi utama untuk mendapatkan respons AI dengan retry logic
  async function getAIResponse(userMessage, retryCount = 0) {
    const currentModel = MODEL_PRIORITY_LIST[currentModelIndex];
    
    // Tampilkan indikator typing sederhana
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.innerHTML = `
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    `;
    chatWindow.appendChild(typingIndicator);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    
    try {
      const messages = [
        {
          role: "system",
          content: "Anda adalah AI Assistant yang membantu dan ramah. Gunakan bahasa Indonesia yang natural dan mudah dipahami."
        },
        ...chatHistory.slice(-4),
        { role: "user", content: userMessage }
      ];
      
      const requestBody = {
        model: currentModel.id,
        messages: messages,
        max_tokens: 800,
        temperature: 0.7
      };
      
      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin || "http://localhost",
          "X-Title": "AI Assistant"
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      // Hapus indikator typing
      typingIndicator.remove();
      
      return data.choices[0].message.content.trim();
      
    } catch (error) {
      // Hapus indikator typing
      typingIndicator.remove();
      
      console.error(`Error pada model ${currentModel.name}:`, error);
      
      // Coba model lain jika masih ada percobaan
      if (retryCount < MAX_RETRIES) {
        const switched = switchToNextModel();
        if (switched) {
          // Coba lagi dengan model baru (tanpa pesan "mencoba model lain")
          return await getAIResponse(userMessage, retryCount + 1);
        }
      }
      
      throw error;
    }
  }
  
  async function handleSendMessage() {
    const message = userInput.value.trim();
    
    if (!message || isProcessing) return;
    
    addMessage(message, true);
    userInput.value = '';
    userInput.focus();
    
    sendBtn.classList.add('loading');
    isProcessing = true;
    sendBtn.disabled = true;
    
    try {
      const response = await getAIResponse(message);
      
      addMessage(response, false);
      
      chatHistory.push({ role: 'user', content: message });
      chatHistory.push({ role: 'assistant', content: response });
      
      if (chatHistory.length > 10) {
        chatHistory = chatHistory.slice(-10);
      }
      
      // Reset failed models jika berhasil
      failedModels.clear();
      
    } catch (error) {
      console.error('Semua model gagal:', error);
      
      // Coba reset ke model pertama
      if (failedModels.size >= MODEL_PRIORITY_LIST.length) {
        addMessage("❌ Maaf, semua model AI sedang tidak tersedia. Silakan coba lagi nanti atau refresh halaman.", false);
        
        // Reset untuk percobaan berikutnya
        failedModels.clear();
        currentModelIndex = 0;
        updateModelInfo();
      } else {
        addMessage("❌ Gagal menghubungi AI. Silakan coba lagi.", false);
      }
      
    } finally {
      sendBtn.classList.remove('loading');
      isProcessing = false;
      sendBtn.disabled = false;
    }
  }
  
  // Event listeners
  sendBtn.addEventListener('click', handleSendMessage);
  chatForm.addEventListener('submit', function(e) {
    e.preventDefault();
    handleSendMessage();
  });
  
  userInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });
  
  // Fitur: Ganti model manual dengan klik pada info model
  document.addEventListener('click', function(e) {
    if (e.target.closest('.model-info')) {
      if (isProcessing) return;
      
      const oldModel = MODEL_PRIORITY_LIST[currentModelIndex];
      currentModelIndex = (currentModelIndex + 1) % MODEL_PRIORITY_LIST.length;
      const newModel = MODEL_PRIORITY_LIST[currentModelIndex];
      
      updateModelInfo();
      // Tidak perlu pesan beralih
    }
  });
  
  // Pesan awal (tanpa menyebut model)
  setTimeout(() => {
    if (chatWindow.children.length <= 1) {
      addMessage("Halo! Saya AI Assistant. Ada yang bisa saya bantu?", false);
    }
  }, 1000);
  
  userInput.focus();

});


