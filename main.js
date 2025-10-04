// Chatbot open/close logic
const chatbotModal = document.getElementById('chatbot-modal');
function toggleChatbot(forceOpen) {
  if(forceOpen === true) {
    chatbotModal.classList.add('open');
  } else if(forceOpen === false) {
    chatbotModal.classList.remove('open');
  } else {
    chatbotModal.classList.toggle('open');
  }
  // Set dark mode if body is dark
  if(document.documentElement.classList.contains('dark')) {
    chatbotModal.classList.add('dark');
  } else {
    chatbotModal.classList.remove('dark');
  }
}

// Open chatbot when "Chat" button is clicked
document.querySelectorAll('.quick-access-button').forEach(btn => {
  if(btn.textContent.trim().includes("Chat")) {
    btn.addEventListener('click', () => toggleChatbot(true));
  }
});

// Chatbot messaging logic (replace with actual API call)
const chatbotForm = document.getElementById('chatbot-form');
const chatbotInput = document.getElementById('chatbot-input');
const chatbotMessages = document.getElementById('chatbot-messages');

chatbotForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  const message = chatbotInput.value.trim();
  if(!message) return;
  appendMessage(message, 'user');
  chatbotInput.value = '';
  chatbotInput.disabled = true;
  // Call real bot reply function (OpenRouter if API key provided, otherwise mock)
  try {
    const botReply = await getBotReply(message);
    appendMessage(botReply, 'bot');
  } catch (err) {
    console.error('Chatbot error:', err);
    appendMessage("I'm having trouble answering right now. Please try again later.", 'bot');
  } finally {
    chatbotInput.disabled = false;
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  }
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
});

function appendMessage(text, sender) {
  const div = document.createElement('div');
  div.className = 'chatbot-bubble ' + sender;
  div.textContent = text;
  chatbotMessages.appendChild(div);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

// Simple mock response for demonstration (replace with actual backend/API call)
async function getBotReplyMock(message) {
  // This is where you would call your backend API (Dialogflow, OpenAI, etc.) and return the result.
  // The below are just canned responses for demo:
  if(/tomato|crop|plant/i.test(message)) {
    return "Tomato grows best in well-drained soils with plenty of sunlight. Would you like info on disease, irrigation, or market price?";
  } else if(/disease|pest/i.test(message)) {
    return "To detect and control crop diseases, regularly inspect your plants and use recommended pesticides only if necessary. Would you like tips for a specific crop?";
  } else if(/weather/i.test(message)) {
    // Added: fetch weather data from Open-Meteo API for demo (Berlin)
    try {
      const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m');
      const data = await res.json();
      const cur = data.current;
      let reply = `Current temperature: ${cur.temperature_2m}°C\nWind speed: ${cur.wind_speed_10m} km/h.\n`;
      reply += "Hourly forecast (temp °C / wind km/h / humidity %):\n";
      for(let i=0;i<5;i++) {
        reply += `${data.hourly.time[i].slice(11,16)}: ${data.hourly.temperature_2m[i]}°C, ${data.hourly.wind_speed_10m[i]} km/h, ${data.hourly.relative_humidity_2m[i]}%\n`;
      }
      // Add suggested crops based on current temperature
      reply += "\n" + getCropSuggestion(cur.temperature_2m, cur.wind_speed_10m);
      reply += "\n(Data from open-meteo.com, Berlin example)";
      return reply;
    } catch(e) {
      return "Unable to fetch weather data right now. Please try again later.";
    }
  } else if(/market|price/i.test(message)) {
    return "Market prices change daily. For tomato, the current rate is ₹35/kg in your local mandi. Want prices for another crop?";
  } else if(/scheme|government/i.test(message)) {
    return "There are several government schemes for farmers. Let me know your state or crop to suggest relevant ones.";
  } else if(/hello|hi|namaste|hey/i.test(message)) {
    return "Hello! How can I help you with your farming needs today?";
  } else {
    return "I'm here to help with farming, crop, and agriculture questions. Please ask about crops, weather, diseases, market, or schemes!";
  }
}

// Try OpenRouter integration; falls back to mock if no API key is set.
async function getBotReply(message) {
  // Prefer using a server-side proxy to keep API key secret
  try {
    const proxyResp = await fetch('/openrouter-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Title': window.OPENROUTER_TITLE || document.title || 'KisanMitra' },
      body: JSON.stringify({ model: 'alibaba/tongyi-deepresearch-30b-a3b:free', messages: [{ role: 'user', content: message }], temperature: 0.2, max_tokens: 800, _referer: window.location.origin })
    });

    if (proxyResp.ok) {
      // Try to parse JSON, but proxy may forward raw text, so handle both
      const text = await proxyResp.text();
      try { const data = JSON.parse(text);
        if (data.output_text) return data.output_text;
        if (data.choices && data.choices[0]) {
          const choice = data.choices[0];
          if (choice.message && choice.message.content) return choice.message.content;
          if (choice.text) return choice.text;
        }
        // fallback to stringified body
        return typeof text === 'string' ? text : JSON.stringify(data);
      } catch (e) {
        return text;
      }
    }
    // If proxy returns non-ok, fall through to direct call fallback below
  } catch (err) {
    console.warn('Proxy call failed, falling back to direct client call:', err);
  }

  // If proxy is unavailable or blocked, optionally allow client-side call with API key
  const apiKey = window.OPENROUTER_API_KEY || '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';
  if (!apiKey || apiKey === '<PUT_YOUR_KEY_HERE>') {
    return getBotReplyMock(message);
  }

  try {
    const site = window.OPENROUTER_SITE || window.location.origin;
    const title = window.OPENROUTER_TITLE || document.title || 'KisanMitra';
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        'HTTP-Referer': site,
        'X-Title': title
      },
      body: JSON.stringify({ model: 'openai/gpt-oss-20b:free', messages: [{ role: 'user', content: message }], temperature: 0.2, max_tokens: 800 })
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error('OpenRouter error: ' + resp.status + ' - ' + text);
    }

    const data = await resp.json();
    // OpenRouter responses may vary; try common fields
    let reply = '';
    if (data.output_text) {
      reply = data.output_text;
    } else if (data.choices && data.choices[0]) {
      const choice = data.choices[0];
      if (choice.message && choice.message.content) reply = choice.message.content;
      else if (choice.text) reply = choice.text;
    } else if (data.result && data.result[0] && data.result[0].content) {
      reply = data.result[0].content;
    } else {
      reply = JSON.stringify(data);
    }

    return reply;
  } catch (err) {
    console.error('OpenRouter fetch failed:', err);
    return "(OpenRouter error) " + (err.message || 'Network or API error');
  }
}

// Suggest crops based on temperature (and optionally wind)
function getCropSuggestion(temp, wind) {
  // Basic rules for example (can be improved)
  // temp in °C
  if (temp >= 25 && temp <= 35) {
    return "🌱 <b>Suitable crops for current weather:</b> Rice, Maize, Cotton, Sugarcane, Soybean";
  } else if (temp >= 20 && temp < 25) {
    return "🌱 <b>Suitable crops for current weather:</b> Wheat, Barley, Mustard, Chickpea, Pea";
  } else if (temp >= 15 && temp < 20) {
    return "🌱 <b>Suitable crops for current weather:</b> Potato, Cabbage, Cauliflower, Carrot, Spinach";
  } else if (temp >= 10 && temp < 15) {
    return "🌱 <b>Suitable crops for current weather:</b> Peas, Garlic, Onion, Lettuce";
  } else if (temp < 10) {
    return "🌱 <b>Suitable crops for current weather:</b> Some root vegetables (radish, turnip), Cabbage";
  } else if (temp > 35) {
    return "🌱 <b>Suitable crops for current weather:</b> Millet, Sorghum, Groundnut (heat-tolerant crops)";
  } else {
    return "🌱 <b>Suitable crops for current weather:</b> Please consult local agri experts for best options.";
  }
}

// ====== Weather Section API integration on Weather Button Click ======
document.addEventListener('DOMContentLoaded', () => {
  // ---------- Language Selection Logic (from langpage.js) ----------
  // Select all language buttons inside the main
  const languageButtons = document.querySelectorAll('main button');
  // Select the Continue button in the footer
  const continueBtn = document.querySelector('footer button');
  // Class to highlight selected language
  const SELECTED_CLASS = 'ring-4 ring-primary ring-offset-2 scale-110';

  // Function to enable/disable Continue button
  function setContinueEnabled(enabled) {
      if(!continueBtn) return;
      continueBtn.disabled = !enabled;
      if (enabled) {
          continueBtn.classList.remove('opacity-50', 'pointer-events-none');
      } else {
          continueBtn.classList.add('opacity-50', 'pointer-events-none');
      }
  }

  // Restore previously selected language from localStorage
  const savedLanguage = localStorage.getItem('selectedLanguage');
  if (savedLanguage) {
      languageButtons.forEach(btn => {
          if (btn.textContent.trim() === savedLanguage) {
              btn.classList.add(...SELECTED_CLASS.split(' '));
              setContinueEnabled(true);
          }
      });
  } else {
      setContinueEnabled(false);
  }

  // Add click event for each language button
  languageButtons.forEach(btn => {
      btn.addEventListener('click', () => {
          // Remove selection from all buttons
          languageButtons.forEach(b => b.classList.remove(...SELECTED_CLASS.split(' ')));
          // Add selection to clicked button
          btn.classList.add(...SELECTED_CLASS.split(' '));
          // Save selected language
          localStorage.setItem('selectedLanguage', btn.textContent.trim());
          setContinueEnabled(true);
      });
  });

  // Continue button click event
  if (continueBtn) {
      continueBtn.addEventListener('click', () => {
          const chosenLanguage = localStorage.getItem('selectedLanguage');
          if (chosenLanguage) {
              // Redirect or use the chosen language
              // Uncomment below to redirect to homepage with language param
              // window.location.href = `/home?lang=${encodeURIComponent(chosenLanguage)}`;
              alert(`You chose: ${chosenLanguage}`);
          } else {
              alert('Please select a language!');
          }
      });
  }

  // ---------- Weather Box Logic ----------
  // Find the weather quick access button
  const weatherBtn = Array.from(document.querySelectorAll('.quick-access-button')).find(btn =>
    btn.textContent.trim().toLowerCase().includes('weather')
  );

  // Create weather info box but don't show it yet
  let weatherInfoBox = document.createElement('div');
  weatherInfoBox.id = "weather-info-box";
  weatherInfoBox.style.display = "none";
  weatherInfoBox.style.margin = '18px auto 0 auto';
  weatherInfoBox.style.maxWidth = "440px";
  // Solid lite green background
  weatherInfoBox.style.background = "#bbf7d0"; // Tailwind green-200 (solid lite green)
  weatherInfoBox.style.borderRadius = "1rem";
  weatherInfoBox.style.boxShadow = "0 4px 28px 0 rgba(0,0,0,0.10)";
  weatherInfoBox.style.padding = "22px 26px";
  weatherInfoBox.style.fontSize = "1.09rem";
  weatherInfoBox.style.lineHeight = "1.7";
  weatherInfoBox.style.color = "#14532d";
  weatherInfoBox.style.position = "fixed";
  weatherInfoBox.style.left = "50%";
  weatherInfoBox.style.top = "13%";
  weatherInfoBox.style.transform = "translate(-50%, 0)";
  weatherInfoBox.style.zIndex = "99";
  weatherInfoBox.style.backdropFilter = "blur(7px)";
  weatherInfoBox.style.border = "1.5px solid #4ade80";
  weatherInfoBox.style.transition = "box-shadow 0.2s";
  weatherInfoBox.innerHTML = "<b>Loading weather...</b>";

  document.body.appendChild(weatherInfoBox);

  // Dismiss box on click outside or ESC
  function hideWeatherBox(e) {
    if (e.type === "keydown" && e.key !== "Escape") return;
    weatherInfoBox.style.display = "none";
    document.removeEventListener('mousedown', hideWeatherBox);
    document.removeEventListener('keydown', hideWeatherBox);
  }

  if (weatherBtn) {
    weatherBtn.addEventListener('click', () => {
      weatherInfoBox.style.display = "block";
      weatherInfoBox.innerHTML = "<b>Loading weather...</b>";
      fetch('https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m')
        .then(res => res.json())
        .then(data => {
          const cur = data.current;
          let html = `<span style="font-size:1.13em;font-weight:600;">Weather (Berlin Example)</span><br>`;
          html += `Now: <b>${cur.temperature_2m}°C</b> &nbsp;|&nbsp; Wind: <b>${cur.wind_speed_10m} km/h</b><br><br>`;
          html += `<span style="font-size:0.99em;">Next 5 hours:</span><ul style="padding-left:18px;margin-top:6px;">`;
          for(let i=0; i<5; i++) {
            html += `<li>${data.hourly.time[i].slice(11,16)}: ${data.hourly.temperature_2m[i]}°C, ${data.hourly.wind_speed_10m[i]} km/h, ${data.hourly.relative_humidity_2m[i]}%</li>`;
          }
          html += `</ul>`;
          // Add crop suggestion
          html += `<div style="margin-top:12px;padding:9px 0 0 0;"><span>${getCropSuggestion(cur.temperature_2m, cur.wind_speed_10m)}</span></div>`;
          html += `<span style="font-size:0.85em;opacity:.7;display:block;margin-top:10px;">Source: <a href="https://open-meteo.com/" target="_blank">open-meteo.com</a></span>`;
          weatherInfoBox.innerHTML = html;
        })
        .catch(() => {
          weatherInfoBox.innerHTML = "<b>Unable to load weather data.</b>";
        });
      setTimeout(() => {
        document.addEventListener('mousedown', hideWeatherBox);
        document.addEventListener('keydown', hideWeatherBox);
      }, 0);
    });
  }
});