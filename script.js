/* ==========================================================================
   BacanAI — script.js
   Chatbot IA usando a API OpenAI-compatível da Groq
   - Chave de API armazenada no localStorage
   - Streaming de tokens com AbortController
   - Tema claro/escuro, configurações e toasts
   ========================================================================== */

(() => {
  'use strict';

  // SUA CHAVE (ATENÇÃO: evite expor em produção)
  const DEFAULT_GROQ_API_KEY = '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';

  // ---------------------------
  // Utilidades de armazenamento
  // ---------------------------
  const LS_PREFIX = 'bacanai.';
  const storage = {
    get(key, def) {
      const raw = localStorage.getItem(LS_PREFIX + key);
      if (raw === null) return def;
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    },
    set(key, val) {
      localStorage.setItem(LS_PREFIX + key, JSON.stringify(val));
    },
    remove(key) {
      localStorage.removeItem(LS_PREFIX + key);
    }
  };

  // ---------------------------
  // Seletores de elementos
  // ---------------------------
  const $ = (sel, root = document) => root.querySelector(sel);

  const els = {
    root: document.documentElement,
    messages: $('#messages'),
    form: $('#chat-form'),
    userInput: $('#user-input'),
    modelSelect: $('#model-select'),
    temperature: $('#temperature'),
    tempValue: $('#temp-value'),
    streaming: $('#streaming'),
    btnSend: $('#btn-send'),
    btnStop: $('#btn-stop'),
    btnClear: $('#btn-clear'),
    btnTheme: $('#btn-theme'),
    // Modal de Configurações
    btnSettings: $('#btn-settings'),
    settingsModal: $('#settings-modal'),
    btnCloseSettings: $('#btn-close-settings'),
    btnCancelSettings: $('#btn-cancel-settings'),
    btnSaveSettings: $('#btn-save-settings'),
    apiKeyInput: $('#api-key'),
    toggleKeyVisibility: $('#toggle-key-visibility'),
    systemPrompt: $('#system-prompt'),
    toasts: $('#toasts')
  };

  // Guardar o HTML inicial para restaurar em "Limpar"
  const initialMessagesHTML = els.messages.innerHTML;

  // ---------------------------
  // Estado da aplicação
  // ---------------------------
  const state = {
    apiKey: storage.get('apiKey', DEFAULT_GROQ_API_KEY),
    model: storage.get('model', 'llama-3.1-8b-instant'),
    temperature: storage.get('temperature', 0.7),
    streaming: storage.get('streaming', true),
    systemPrompt: storage.get('systemPrompt', ''),
    theme: storage.get('theme', detectPreferredTheme()),
    generating: false,
    controller: null,
    messages: storage.get('messages', []) // [{role:'user'|'assistant', content:''}]
  };

  // Se não havia chave salva, persiste a default e avisa
  const hadKey = localStorage.getItem(LS_PREFIX + 'apiKey') !== null;
  if (!hadKey && state.apiKey) {
    storage.set('apiKey', state.apiKey);
    setTimeout(() => showToast('Groq API Key foi pré-configurada localmente.', 'success'), 300);
  }

  function detectPreferredTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  // ---------------------------
  // Inicialização
  // ---------------------------
  init();
  function init() {
    // Aplicar tema
    setTheme(state.theme);

    // Aplicar configurações nos inputs
    els.modelSelect.value = state.model;
    els.temperature.value = String(state.temperature);
    els.tempValue.textContent = String(state.temperature);
    els.streaming.checked = !!state.streaming;

    // Renderizar histórico se existir
    if (state.messages.length > 0) {
      els.messages.innerHTML = '';
      for (const m of state.messages) {
        appendMessage(m.role, m.content);
      }
    }

    // Eventos
    bindEvents();

    // Ajuste do textarea e foco
    autoResize(els.userInput);
    els.userInput.focus();
  }

  function bindEvents() {
    // Envio do formulário
    els.form.addEventListener('submit', onSubmit);

    // Enter para enviar / Shift+Enter para quebrar linha
    els.userInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        els.form.requestSubmit();
      }
    });

    // Auto-resize do textarea
    els.userInput.addEventListener('input', () => autoResize(els.userInput));

    // Slider de temperatura
    els.temperature.addEventListener('input', () => {
      els.tempValue.textContent = els.temperature.value;
    });
    els.temperature.addEventListener('change', () => {
      state.temperature = parseFloat(els.temperature.value);
      storage.set('temperature', state.temperature);
    });

    // Modelo
    els.modelSelect.addEventListener('change', () => {
      state.model = els.modelSelect.value;
      storage.set('model', state.model);
    });

    // Streaming
    els.streaming.addEventListener('change', () => {
      state.streaming = !!els.streaming.checked;
      storage.set('streaming', state.streaming);
    });

    // Botão parar
    els.btnStop.addEventListener('click', onStop);

    // Limpar conversa
    els.btnClear.addEventListener('click', onClear);

    // Tema
    els.btnTheme.addEventListener('click', () => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      setTheme(next);
      storage.set('theme', next);
    });

    // Modal de configurações
    els.btnSettings.addEventListener('click', openSettings);
    els.btnCloseSettings.addEventListener('click', closeSettings);
    els.btnCancelSettings.addEventListener('click', closeSettings);
    els.btnSaveSettings.addEventListener('click', saveSettings);

    // Toggle visibilidade da chave
    els.toggleKeyVisibility.addEventListener('click', () => {
      const isPass = els.apiKeyInput.type === 'password';
      els.apiKeyInput.type = isPass ? 'text' : 'password';
      els.toggleKeyVisibility.textContent = isPass ? '🙈' : '👁️';
    });

    // Fechar modal com Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !els.settingsModal.classList.contains('hidden')) {
        closeSettings();
      }
    });

    // Clique fora do conteúdo fecha o modal
    els.settingsModal.addEventListener('click', (e) => {
      if (e.target === els.settingsModal) {
        closeSettings();
      }
    });
  }

  // ---------------------------
  // UI: Tema, Toasts, Modal
  // ---------------------------
  function setTheme(theme) {
    state.theme = theme;
    els.root.setAttribute('data-theme', theme);
    els.btnTheme.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  function showToast(message, type = 'info', duration = 3800) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;

    const color =
      type === 'success' ? 'var(--success)' :
      type === 'error' ? 'var(--danger)' :
      type === 'warning' ? 'var(--warning)' :
      'var(--primary)';

    toast.style.borderLeftColor = color;
    els.toasts.appendChild(toast);

    // Auto-remover
    const t1 = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(4px)';
    }, Math.max(500, duration - 320));
    const t2 = setTimeout(() => {
      toast.remove();
      clearTimeout(t1);
    }, duration);
    // Clique para fechar
    toast.addEventListener('click', () => {
      clearTimeout(t1);
      clearTimeout(t2);
      toast.remove();
    });
  }

  function openSettings() {
    // Preencher campos com valores atuais
    els.apiKeyInput.value = state.apiKey || '';
    els.systemPrompt.value = state.systemPrompt || '';
    els.settingsModal.classList.remove('hidden');
  }

  function closeSettings() {
    els.settingsModal.classList.add('hidden');
  }

  function saveSettings() {
    const key = els.apiKeyInput.value.trim();
    const sp = els.systemPrompt.value.trim();

    if (!key) {
      showToast('Cole sua Groq API Key para continuar.', 'warning');
      return;
    }
    // Validação simples do formato da Groq Key (gsk_...)
    if (!/^gsk_[A-Za-z0-9]{20,}$/.test(key)) {
      showToast('A chave parece inválida. Verifique e tente novamente.', 'error');
      return;
    }

    state.apiKey = key;
    state.systemPrompt = sp;

    storage.set('apiKey', state.apiKey);
    storage.set('systemPrompt', state.systemPrompt);

    showToast('Configurações salvas.', 'success');
    closeSettings();
  }

  // ---------------------------
  // UI: Mensagens
  // ---------------------------
  function appendMessage(role, content, opts = {}) {
    const msgEl = document.createElement('div');
    msgEl.className = 'message ' + (role === 'user' ? 'user' : 'assistant');

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = role === 'user' ? '🙂' : '🤖';

    const bubble = document.createElement('div');
    bubble.className = 'bubble';

    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = role === 'user' ? 'Você' : 'BacanAI';

    const contentEl = document.createElement('div');
    contentEl.className = 'content';

    if (opts.rawHtml) {
      contentEl.innerHTML = content || '';
    } else {
      contentEl.innerHTML = renderMarkdownSafe(content || '');
    }

    bubble.appendChild(name);
    bubble.appendChild(contentEl);

    msgEl.appendChild(avatar);
    msgEl.appendChild(bubble);

    els.messages.appendChild(msgEl);
    scrollToBottom();

    return { msgEl, bubble, contentEl };
  }

  function appendAssistantTyping() {
    const { msgEl, bubble, contentEl } = appendMessage('assistant', '');
    bubble.classList.add('typing');
    return { msgEl, bubble, contentEl };
  }

  function updateAssistantContent(contentEl, text, bubble) {
    if (bubble?.classList.contains('typing')) {
      bubble.classList.remove('typing');
    }
    contentEl.innerHTML = renderMarkdownSafe(text);
    scrollToBottom();
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      els.messages.scrollTop = els.messages.scrollHeight;
    });
  }

  function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, window.innerHeight * 0.38) + 'px';
  }

  // ---------------------------
  // Envio da mensagem
  // ---------------------------
  async function onSubmit(e) {
    e.preventDefault();
    if (state.generating) {
      showToast('Aguarde a resposta atual finalizar ou pressione Parar.', 'warning');
      return;
    }
    const text = els.userInput.value.trim();
    if (!text) return;

    if (!state.apiKey) {
      openSettings();
      showToast('Cole sua Groq API Key nas configurações para continuar.', 'warning');
      return;
    }

    // Acrescentar mensagem do usuário (UI + estado)
    appendMessage('user', text);
    state.messages.push({ role: 'user', content: text });
    storage.set('messages', state.messages);

    els.userInput.value = '';
    autoResize(els.userInput);

    // Placeholder do assistente
    const { contentEl, bubble } = appendAssistantTyping();

    try {
      setGenerating(true);

      const payloadMessages = [];
      if (state.systemPrompt) {
        payloadMessages.push({
          role: 'system',
          content: state.systemPrompt
        });
      }
      for (const m of state.messages) {
        payloadMessages.push({ role: m.role, content: m.content });
      }

      const responseText = await chatWithGroq({
        messages: payloadMessages,
        model: state.model,
        temperature: state.temperature,
        stream: state.streaming
      }, (delta) => {
        // Streaming callback: acumula no último assistant
        const last = state.messages[state.messages.length - 1];
        if (!last || last.role !== 'assistant') {
          state.messages.push({ role: 'assistant', content: '' });
        }
        state.messages[state.messages.length - 1].content += delta;
        updateAssistantContent(contentEl, state.messages[state.messages.length - 1].content, bubble);
      });

      if (!state.streaming) {
        state.messages.push({ role: 'assistant', content: responseText || '' });
        updateAssistantContent(contentEl, responseText || '', bubble);
      }

      storage.set('messages', state.messages);
    } catch (err) {
      const msg = humanizeError(err);
      updateAssistantContent(contentEl, `Desculpe, algo deu errado.\n\n${msg}`, bubble);
      showToast(msg, 'error', 5200);
    } finally {
      setGenerating(false);
    }
  }

  function onStop() {
    if (state.controller) {
      state.controller.abort();
      showToast('Geração interrompida.', 'info');
    }
  }

  async function onClear() {
    if (state.generating) {
      const go = confirm('Uma geração está em andamento. Interromper e limpar a conversa?');
      if (!go) return;
      if (state.controller) {
        try { state.controller.abort(); } catch {}
      }
    }
    state.messages = [];
    storage.set('messages', state.messages);
    els.messages.innerHTML = initialMessagesHTML;
    showToast('Conversa limpa.', 'success');
    scrollToBottom();
  }

  function setGenerating(v) {
    state.generating = v;
    els.btnSend.disabled = v;
    els.userInput.disabled = v;
    els.btnStop.classList.toggle('hidden', !v);
  }

  // ---------------------------
  // Integração com a API Groq
  // ---------------------------
  const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

  async function chatWithGroq({ messages, model, temperature, stream }, onDelta) {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.apiKey}`
    };
    const body = {
      model,
      messages,
      temperature,
      stream: !!stream
    };

    state.controller = new AbortController();
    const signal = state.controller.signal;

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal
    });

    if (!res.ok) {
      let text = await safeReadText(res);
      try {
        const j = JSON.parse(text);
        text = j.error?.message || text;
      } catch {}
      throw new Error(`[${res.status}] ${text || 'Falha na requisição'}`);
    }

    if (stream) {
      await readStream(res, onDelta);
      state.controller = null;
      return ''; // conteúdo final já foi montado via onDelta
    } else {
      const data = await res.json();
      state.controller = null;
      const content = data?.choices?.[0]?.message?.content || '';
      return content;
    }
  }

  async function readStream(res, onDelta) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Eventos SSE são separados por \n\n
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const part of parts) {
        const lines = part.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (!data) continue;
          if (data === '[DONE]') {
            return;
          }
          try {
            const json = JSON.parse(data);
            const delta = json?.choices?.[0]?.delta?.content ?? '';
            if (delta) onDelta(delta);
          } catch {
            // ignora pacotes malformados
          }
        }
      }
    }
  }

  async function safeReadText(res) {
    try {
      return await res.text();
    } catch {
      return 'Erro de rede';
    }
  }

  function humanizeError(err) {
    const msg = String(err?.message || err || 'Erro desconhecido');

    if (msg.includes('401')) {
      return 'Não autorizado: verifique sua Groq API Key.';
    }
    if (msg.includes('429')) {
      return 'Limite de taxa excedido. Tente novamente em instantes.';
    }
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      return 'Erro de rede ou CORS. Verifique sua conexão ou tente via HTTPS.';
    }
    if (err?.name === 'AbortError') {
      return 'Requisição cancelada.';
    }
    return msg;
  }

  // ---------------------------
  // Renderização Markdown segura
  // ---------------------------
  function escapeHtml(s) {
    return s
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function renderMarkdownSafe(md) {
    if (!md) return '';

    // Divide por blocos de código com ```
    const parts = md.split(/```/);
    let out = '';

    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        // Texto normal
        const esc = escapeHtml(parts[i]);
        // Inline code `...`
        const inline = esc.replace(/`([^`]+)`/g, '<code>$1</code>');
        const paragraphs = inline
          .trim()
          .split(/\n{2,}/)
          .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
          .join('');
        out += paragraphs;
      } else {
        // Bloco de código
        let codeBlock = parts[i];
        let lang = '';
        const nl = codeBlock.indexOf('\n');
        if (nl !== -1) {
          lang = codeBlock.slice(0, nl).trim();
          codeBlock = codeBlock.slice(nl + 1);
        }
        const escCode = escapeHtml(codeBlock);
        out += `<pre><code class="language-${lang}">${escCode}</code></pre>`;
      }
    }

    return out || '';
  }

})();
