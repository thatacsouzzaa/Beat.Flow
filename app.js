// Elementos do DOM
const entradaUrlServidor = document.getElementById("serverUrl");
const botaoConectar = document.getElementById("connectBtn");
const elementoStatus = document.getElementById("status");
const musicGridEl = document.getElementById("musicGrid");
const audioEl = document.getElementById("audio");
const tocandoAgoraEl = document.getElementById("nowPlaying");
const loadingMessageEl = document.getElementById("loadingMessage");
const menuToggleInput = document.querySelector("#menuToggle input[type=\"checkbox\"]");

// Estado da aplicação
let isConnected = false;
let currentSongs = [];

// Carrega URL salva e tenta conectar automaticamente
const urlSalva = localStorage.getItem("urlServidor") ?? localStorage.getItem("serverUrl");
if (urlSalva) {
    entradaUrlServidor.value = urlSalva;
    // Pequeno atraso para garantir que o DOM esteja pronto e evitar bloqueios
    setTimeout(() => {
        conectarServidor();
    }, 500);
}

// Utilitários
function juntarUrl(base, relativo) {
    try {
        // Adiciona http:// se não houver protocolo para que new URL funcione corretamente
        const fullBase = base.startsWith("http://") || base.startsWith("https://") ? base : `http://${base}`;
        const url = new URL(relativo, fullBase);
        return url.href;
    } catch (e) {
        console.error("Erro ao juntar URLs:", e);
        // Fallback para concatenação simples se a criação de URL falhar
        return base.replace(/\/+$/, "") + "/" + relativo.replace(/^\/+/, "");
    }
}

async function buscarJSON(url) {
    try {
        const resposta = await fetch(url);
        if (!resposta.ok) {
            const erroTexto = await resposta.text();
            throw new Error(`HTTP ${resposta.status}: ${erroTexto}`);
        }
        return resposta.json();
    } catch (error) {
        console.error(`Erro ao buscar JSON de ${url}:`, error);
        throw error; // Re-lança o erro para ser tratado pelo chamador
    }
}

function definirStatus(mensagem, tipo = "info") {
    if (elementoStatus) {
        elementoStatus.textContent = mensagem;
        elementoStatus.className = `status-${tipo}`;
        elementoStatus.style.animation = "none";
        setTimeout(() => {
            elementoStatus.style.animation = "pulse 0.5s ease-out";
        }, 10);
    }
}

// Animações e efeitos visuais
function criarParticulas() {
    const particleContainer = document.createElement("div");
    particleContainer.className = "particles";
    document.body.appendChild(particleContainer);

    for (let i = 0; i < 50; i++) {
        const particle = document.createElement("div");
        particle.className = "particle";
        particle.style.left = Math.random() * 100 + "%";
        particle.style.animationDelay = Math.random() * 3 + "s";
        particle.style.animationDuration = (Math.random() * 3 + 2) + "s";
        particleContainer.appendChild(particle);
    }
}

function animarLogo() {
    const logo = document.querySelector(".logo");
    if (logo) {
        logo.style.animation = "logoFloat 3s ease-in-out infinite";
    }
}

function criarOndasSonoras() {
    const player = document.querySelector(".player");
    if (player && !player.querySelector(".sound-waves")) {
        const waves = document.createElement("div");
        waves.className = "sound-waves";
        for (let i = 0; i < 5; i++) {
            const wave = document.createElement("div");
            wave.className = "wave";
            wave.style.animationDelay = i * 0.1 + "s";
            waves.appendChild(wave);
        }
        player.appendChild(waves);
    }
}

function mostrarNotificacao(mensagem, tipo = "success") {
    const notification = document.createElement("div");
    notification.className = `notification notification-${tipo}`;
    notification.textContent = mensagem;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add("show");
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove("show");
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Conectar ao servidor
async function conectarServidor() {
    const base = entradaUrlServidor.value.trim().replace(/\/+$/, "");
    if (!base) {
        definirStatus("Informe a URL do servidor.", "error");
        return;
    }

    // Salva URL
    localStorage.setItem("urlServidor", base);
    localStorage.setItem("serverUrl", base);

    definirStatus("Conectando...", "loading");
    mostrarCarregamento(true);

    try {
        // Tenta conectar à API de saúde
        const saude = await buscarJSON(juntarUrl(base, "/api/saude"));
        definirStatus(`Conectado! ${saude.count} músicas disponíveis.`, "success");
        isConnected = true;
        
        mostrarNotificacao(`Conectado com sucesso! ${saude.count} músicas encontradas.`);
        
        // Busca as músicas
        const musicas = await buscarJSON(juntarUrl(base, "/api/musicas"));
        currentSongs = musicas;
        await renderizarMusicas(base, musicas);
        
        // Inicia efeitos visuais
        criarOndasSonoras();
        
        // Fecha o menu hambúrguer após a conexão bem-sucedida
        if (menuToggleInput) {
            menuToggleInput.checked = false;
        }

    } catch (erro) {
        definirStatus("Falha ao conectar. Verifique a URL, a porta e a rede.", "error");
        mostrarNotificacao("Erro ao conectar com o servidor. Verifique o console para detalhes.", "error");
        isConnected = false;
        console.error("Erro na conexão ou ao buscar músicas:", erro);
        mostrarCarregamento(false);
    }
}

function mostrarCarregamento(show) {
    if (loadingMessageEl) {
        if (show) {
            loadingMessageEl.style.display = "flex"; // Usar flex para centralizar spinner e texto
            loadingMessageEl.querySelector("p").textContent = "Carregando músicas...";
        } else {
            loadingMessageEl.style.display = "none";
        }
    }
}

// Renderizar músicas com animações
async function renderizarMusicas(base, musicas) {
    if (!musicGridEl) {
        console.error("Elemento #musicGrid não encontrado no DOM. Não é possível renderizar músicas.");
        definirStatus("Erro interno: Elemento de músicas não encontrado.", "error");
        mostrarCarregamento(false);
        return;
    }

    // Limpa o grid
    musicGridEl.innerHTML = "";

    if (!musicas.length) {
        const emptyMessage = document.createElement("div");
        emptyMessage.className = "empty-message";
        emptyMessage.innerHTML = `
            <div class="empty-icon">🎵</div>
            <p>Nenhuma música encontrada no servidor.</p>
        `;
        musicGridEl.appendChild(emptyMessage);
        mostrarCarregamento(false);
        return;
    }

    // Cria cards de música com animação escalonada
    musicas.forEach((musica, index) => {
        setTimeout(() => {
            criarCardMusica(base, musica, index);
        }, index * 100); // Delay escalonado para cada card
    });
    mostrarCarregamento(false);
}

function criarCardMusica(base, musica, index) {
    const card = document.createElement("div");
    card.className = "music-card";
    card.style.animationDelay = (index * 0.1) + "s";

    // Adiciona a imagem da música/artista
    const imageContainer = document.createElement("div");
    imageContainer.className = "music-image-container";
    const image = document.createElement("img");
    image.src = musica.image_url || "img/placeholder.png"; // Usa image_url ou placeholder
    image.alt = musica.title || "Capa da Música";
    imageContainer.appendChild(image);
    card.appendChild(imageContainer);

    const musicInfo = document.createElement("div");
    musicInfo.className = "music-info";

    const titulo = document.createElement("div");
    titulo.className = "music-title";
    titulo.textContent = musica.title || "(Sem título)";

    const artista = document.createElement("div");
    artista.className = "music-artist";
    artista.textContent = musica.artist || "Desconhecido";

    musicInfo.appendChild(titulo);
    musicInfo.appendChild(artista);

    const botaoTocar = document.createElement("button");
    botaoTocar.className = "play-button";
    botaoTocar.textContent = "Tocar";
    
    // Adiciona evento de clique com animação
    botaoTocar.addEventListener("click", (e) => {
        e.preventDefault();
        animarBotaoClick(botaoTocar);
        tocarMusica(base, musica);
    });

    // Hover effect no card
    card.addEventListener("mouseenter", () => {
        card.style.transform = "translateY(-8px) scale(1.02)";
    });

    card.addEventListener("mouseleave", () => {
        card.style.transform = "translateY(0) scale(1)";
    });

    card.appendChild(musicInfo);
    card.appendChild(botaoTocar);
    musicGridEl.appendChild(card);

    // Animação de entrada
    setTimeout(() => {
        card.classList.add("card-visible");
    }, 50);
}

function animarBotaoClick(botao) {
    botao.style.transform = "scale(0.95)";
    botao.style.background = ' #523371ff ';
    
    setTimeout(() => {
        botao.style.transform = "scale(1)";
        botao.style.background = ' #523371ff ';
    }, 150);
}

// Tocar música com efeitos visuais
function tocarMusica(base, musica) {
    const url = musica.url?.startsWith("http") ? musica.url : juntarUrl(base, musica.url);
    
    // Animação de loading no player
    const player = document.querySelector(".player");
    if (player) {
        player.classList.add("loading-music");
    }
    
    audioEl.src = url;
    audioEl.play().then(() => {
        if (player) {
            player.classList.remove("loading-music");
            player.classList.add("playing");
        }
        
        if (tocandoAgoraEl) {
            tocandoAgoraEl.textContent = `♪ ${musica.title} — ${musica.artist}`;
            tocandoAgoraEl.style.animation = "slideInFromBottom 0.5s ease-out";
        }
        
        mostrarNotificacao(`Tocando: ${musica.title}`);
        
        // Ativa ondas sonoras
        const waves = document.querySelectorAll(".wave");
        waves.forEach(wave => {
            wave.style.animationPlayState = "running";
        });
        
    }).catch(erro => {
        if (player) {
            player.classList.remove("loading-music");
        }
        console.error("Erro ao tocar música:", erro);
        mostrarNotificacao("Erro ao reproduzir música.", "error");
    });
}

// Event listeners
botaoConectar.addEventListener("click", conectarServidor);

// Enter key no input
entradaUrlServidor.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        conectarServidor();
    }
});

// Audio events
audioEl.addEventListener("ended", () => {
    const player = document.querySelector(".player");
    if (player) {
        player.classList.remove("playing");
    }
    if (tocandoAgoraEl) {
        tocandoAgoraEl.textContent = "";
    }
    
    const waves = document.querySelectorAll(".wave");
    waves.forEach(wave => {
        wave.style.animationPlayState = "paused";
    });
});

audioEl.addEventListener("pause", () => {
    const player = document.querySelector(".player");
    if (player) {
        player.classList.remove("playing");
    }
    
    const waves = document.querySelectorAll(".wave");
    waves.forEach(wave => {
        wave.style.animationPlayState = "paused";
    });
});

audioEl.addEventListener("play", () => {
    const player = document.querySelector(".player");
    if (player) {
        player.classList.add("playing");
    }
    
    const waves = document.querySelectorAll(".wave");
    waves.forEach(wave => {
        wave.style.animationPlayState = "running";
    });
});

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
    // Inicia animações de fundo
    criarParticulas();
    animarLogo();
    
    // Adiciona estilos dinâmicos para animações
    adicionarEstilosDinamicos();
    
    // Se não há URL salva, mostra mensagem inicial
    if (!urlSalva) {
        definirStatus("Configure a URL do servidor no menu.", "info");
    }
});

function adicionarEstilosDinamicos() {
    const style = document.createElement("style");
    style.textContent = `
        @keyframes logoFloat {
            0%, 100% { transform: translateX(-50%) translateY(0px); }
            50% { transform: translateX(-50%) translateY(-10px); }
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        
        @keyframes slideInFromBottom {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        
        .particles {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1;
        }
        
        .particle {
            position: absolute;
            width: 4px;
            height: 4px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            animation: float linear infinite;
        }
        
        @keyframes float {
            0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(-100px) rotate(360deg); opacity: 0; }
        }
        
        .sound-waves {
            position: absolute;
            bottom: -20px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 3px;
        }
        
        .wave {
            width: 4px;
            height: 20px;
            background: linear-gradient(to top, #9c9bf0 , #764ba2 );
            border-radius: 2px;
            animation: wave 0.8s ease-in-out infinite alternate;
            animation-play-state: paused;
        }
        
        @keyframes wave {
            0% { height: 5px; }
            100% { height: 25px; }
        }
        
        .player.loading-music {
            animation: pulse 1s ease-in-out infinite;
        }
        
        .player.playing {
            box-shadow: 0 15px 40px rgba(102, 126, 234, 0.4);
        }
        
        .notification {
            position: fixed;
            top: 100px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 10px;
            color: white;
            font-weight: bold;
            z-index: 3000;
            transform: translateX(100%);
            transition: transform 0.3s ease-out;
        }
        
        .notification.show {
            transform: translateX(0);
        }
        
        .notification-success {
            background: linear-gradient(45deg, #784cafff, #5645a0ff);
        }
        
        .notification-error {
            background: linear-gradient(45deg, #f44336, #d32f2f);
        }
        
        .empty-message {
            grid-column: 1 / -1;
            text-align: center;
            padding: 60px 20px;
            color: white;
        }
        
        .empty-icon {
            font-size: 48px;
            margin-bottom: 20px;
            animation: bounce 2s infinite;
        }
        
        @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
            60% { transform: translateY(-5px); }
        }
        
        .card-visible {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
        
        .status-success { color: #4CAF50; }
        .status-error { color: #f44336; }
        .status-loading { color: #2196F3; }
    `;
    document.head.appendChild(style);
}

