(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const welcome = $("#welcome-screen");
  const main = $("#main-screen");
  const enterButton = $("#enter-button");
  const backButton = $("#back-button");
  const form = $("#command-form");
  const input = $("#command-input");
  const history = $("#history");
  const audio = $("#background-audio");
  const backgroundVideo = $(".background-video");
  const musicToggle = $("#music-toggle");
  const musicIcon = $("#music-icon");
  const musicLabel = $("#music-label");
  const musicTime = $("#music-time");
  const musicProgress = $("#music-progress");
  const musicProgressFill = $("#music-progress-fill");
  const promptText = "tidyi@system:~$";
  const trackTitle = "Ax and the Hatchetmen - Loser Official Visualizer";
  const defaultTrackDuration = 3 * 60 + 32;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Animate the browser-tab title through the tidyi typing cycle.
  const titleFrames = ["t", "ti", "tid", "tidy", "tidyi", "tidy", "tid", "ti", "t"];
  let titleFrameIndex = 0;
  document.title = titleFrames[0];
  window.setInterval(() => {
    titleFrameIndex = (titleFrameIndex + 1) % titleFrames.length;
    document.title = titleFrames[titleFrameIndex];
  }, 300);

  // The video is decorative only; the MP3 remains the only audio source.
  if (backgroundVideo) {
    backgroundVideo.muted = true;
    const videoPlay = backgroundVideo.play();
    if (videoPlay && typeof videoPlay.catch === "function") videoPlay.catch(() => {});
  }

  let entered = false;
  let commandHistory = [];
  let historyIndex = 0;

  const SOCIALS = {
    github: "https://github.com/tidyi",
    instagram: "https://www.instagram.com/for_alexample/",
    discord: "https://discord.com/users/557043304714338309",
    steam: "https://steamcommunity.com/id/gypd/"
  };

  const COMMANDS = [
    "help", "whoami", "about", "focus", "interests", "socials",
    "github", "instagram", "discord", "steam", "music", "date",
    "ping", "clear", "cls", "back", "exit"
  ];

  function setMusicState(playing) {
    musicToggle.setAttribute("aria-pressed", String(playing));
    musicIcon.textContent = playing ? "Ⅱ" : "▶";
    musicLabel.textContent = playing ? "pause" : "play";
    document.body.classList.toggle("music-playing", playing);
  }

  function formatTime(seconds) {
    const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = String(safeSeconds % 60).padStart(2, "0");
    return `${minutes}:${remainder}`;
  }

  function updateMusicProgress() {
    if (!audio || !musicTime || !musicProgress || !musicProgressFill) return;

    // Keep the displayed player length at the requested 3:32.
    const loadedDuration = defaultTrackDuration;
    const elapsed = Number.isFinite(audio.currentTime)
      ? Math.min(Math.max(audio.currentTime, 0), loadedDuration)
      : 0;
    const percent = Math.max(0, Math.min(100, (elapsed / loadedDuration) * 100));

    musicTime.textContent = `${formatTime(elapsed)} / ${formatTime(loadedDuration)}`;
    musicProgress.setAttribute("aria-valuemax", String(Math.round(loadedDuration)));
    musicProgress.setAttribute("aria-valuenow", String(Math.floor(elapsed)));
    musicProgressFill.style.width = `${percent}%`;
  }

  async function playMusic() {
    if (!audio) return false;
    try {
      audio.volume = 0.32;
      await audio.play();
      setMusicState(true);
      updateMusicProgress();
      return true;
    } catch (error) {
      setMusicState(false);
      updateMusicProgress();
      return false;
    }
  }

  function pauseMusic() {
    if (audio) audio.pause();
    setMusicState(false);
  }

  updateMusicProgress();
  if (audio) {
    ["timeupdate", "loadedmetadata", "durationchange", "seeked", "ended"].forEach((eventName) => {
      audio.addEventListener(eventName, updateMusicProgress);
    });
  }

  function enterSite() {
    if (entered) return;
    entered = true;

    // Audio starts in response to the Enter click, satisfying browser autoplay rules.
    void playMusic();
    if (backgroundVideo) {
      const videoPlay = backgroundVideo.play();
      if (videoPlay && typeof videoPlay.catch === "function") videoPlay.catch(() => {});
    }
    welcome.classList.add("is-leaving");

    const showTerminal = () => {
      welcome.hidden = true;
      welcome.classList.remove("is-leaving");
      main.hidden = false;
      main.classList.remove("is-entering");
      void main.offsetWidth;
      main.classList.add("is-entering");
      input.focus({ preventScroll: true });
    };

    if (reduceMotion) showTerminal();
    else window.setTimeout(showTerminal, 180);
  }

  function returnToWelcome() {
    main.hidden = true;
    welcome.hidden = false;
    welcome.classList.remove("is-leaving");
    history.replaceChildren();
    input.value = "";
    entered = false;
    pauseMusic();
    enterButton.focus({ preventScroll: true });
  }

  enterButton.addEventListener("click", enterSite);
  backButton.addEventListener("click", returnToWelcome);

  function typeText(element, text, delay = 10) {
    return new Promise((resolve) => {
      const value = String(text);
      if (reduceMotion || !value) {
        element.textContent = value;
        resolve();
        return;
      }

      let index = 0;
      element.textContent = "";
      const tick = () => {
        if (!element.isConnected) {
          resolve();
          return;
        }
        index += 1;
        element.textContent = value.slice(0, index);
        if (index >= value.length) resolve();
        else window.setTimeout(tick, delay);
      };
      window.setTimeout(tick, delay);
    });
  }

  function makeCommandButton(label) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "suggestion-command";
    button.textContent = label;
    button.addEventListener("click", () => {
      commandHistory.push(label);
      historyIndex = commandHistory.length;
      runCommand(label);
      input.value = "";
      input.focus({ preventScroll: true });
    });
    return button;
  }

  function buildHelpOutput() {
    const content = document.createElement("div");
    content.className = "help-output pending-output";
    content.hidden = true;

    const title = document.createElement("p");
    title.className = "output-label";
    title.textContent = "AVAILABLE COMMANDS";
    content.append(title);

    const list = document.createElement("div");
    list.className = "command-list";
    [
      ["whoami", "a little introduction"],
      ["about", "a tiny confession"],
      ["focus", "what I'm working on"],
      ["interests", "things I like"],
      ["socials", "find me online"],
      ["music", "show the current track"],
      ["clear", "clear terminal output"],
      ["back", "return to the start"]
    ].forEach(([name, description]) => {
      const row = document.createElement("div");
      row.className = "command-row";
      row.append(makeCommandButton(name));
      const detail = document.createElement("span");
      detail.textContent = description;
      row.append(detail);
      list.append(row);
    });
    content.append(list);

    const note = document.createElement("p");
    note.className = "help-note";
    note.textContent = "Click a command or type it below.";
    content.append(note);
    return content;
  }

  function buildLinksOutput(items) {
    const output = document.createElement("div");
    output.className = "terminal-output link-output pending-output";
    output.hidden = true;
    items.forEach(([url, label], index) => {
      if (index > 0) output.append(document.createTextNode("   ·   "));
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = label;
      output.append(link);
    });
    return output;
  }

  function addEntry(command, output = "", type = "text") {
    const entry = document.createElement("div");
    entry.className = "history-entry";

    const line = document.createElement("p");
    line.className = "history-line";

    const prompt = document.createElement("span");
    prompt.className = "prompt-muted";
    prompt.textContent = `${promptText} `;

    const typedCommand = document.createElement("span");
    typedCommand.className = "command-text";
    line.append(prompt, typedCommand);
    entry.append(line);

    let outputElement;
    if (type === "help") {
      outputElement = buildHelpOutput();
    } else if (type === "links") {
      outputElement = buildLinksOutput(output);
    } else {
      outputElement = document.createElement("p");
      outputElement.className = type === "error" ? "terminal-output is-error pending-output" : "terminal-output pending-output";
      outputElement.hidden = true;
      entry.append(outputElement);
    }
    if (type === "help" || type === "links") entry.append(outputElement);

    history.append(entry);
    entry.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });

    // Echo the submitted command like a small typewriter, then reveal its response.
    void (async () => {
      await typeText(typedCommand, command, 13);
      if (!entry.isConnected) return;
      if (type === "help" || type === "links") {
        outputElement.hidden = false;
        outputElement.classList.remove("pending-output");
      } else {
        outputElement.hidden = false;
        outputElement.classList.remove("pending-output");
        await typeText(outputElement, output, 7);
      }
      if (entry.isConnected) {
        entry.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
      }
    })();
  }

  function runCommand(raw) {
    const original = raw.trim();
    const command = original.toLowerCase();
    if (!command) return;

    if (command === "clear" || command === "cls") {
      history.replaceChildren();
      return;
    }
    if (command === "back" || command === "exit") {
      returnToWelcome();
      return;
    }

    switch (command) {
      case "help":
        addEntry(original, "", "help");
        break;
      case "whoami":
        addEntry(original, "I am new here, i love everything about this. I will start building slowly and you will love everything about me soon enough.");
        break;
      case "about":
        addEntry(original, "i want you to fall in-love with me.");
        break;
      case "focus":
        addEntry(original, "getting better · having fun · learning python");
        break;
      case "interests":
        addEntry(original, "gaming · music · late nights · good stories · meeting people");
        break;
      case "socials":
      case "links":
        addEntry(original, [
          [SOCIALS.github, "github"],
          [SOCIALS.instagram, "instagram"],
          [SOCIALS.discord, "discord"],
          [SOCIALS.steam, "steam"]
        ], "links");
        break;
      case "github":
      case "instagram":
      case "discord":
      case "steam":
        addEntry(original, [[SOCIALS[command], `open ${command} ↗`]], "links");
        break;
      case "music":
        addEntry(original, trackTitle);
        if (audio.paused) void playMusic();
        break;
      case "date":
        addEntry(original, new Date().toLocaleString());
        break;
      case "ping":
        addEntry(original, "pong — system is responding.");
        break;
      default:
        addEntry(original, `command not found: ${original}. Type help to see available commands.`, "error");
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = input.value.trim();
    if (!value) return;
    commandHistory.push(value);
    historyIndex = commandHistory.length;
    runCommand(value);
    input.value = "";
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (historyIndex > 0) {
        historyIndex -= 1;
        input.value = commandHistory[historyIndex];
        input.setSelectionRange(input.value.length, input.value.length);
      }
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        historyIndex += 1;
        input.value = commandHistory[historyIndex];
      } else {
        historyIndex = commandHistory.length;
        input.value = "";
      }
    } else if (event.key === "Tab") {
      event.preventDefault();
      const value = input.value.trim().toLowerCase();
      if (!value) {
        input.value = "help";
        return;
      }
      const matches = COMMANDS.filter((item) => item.startsWith(value));
      if (matches.length === 1) {
        input.value = matches[0];
      } else if (matches.length > 1) {
        addEntry(`autocomplete ${value}`, `suggestions: ${matches.join(" · ")}`);
      }
    }
  });

  document.querySelectorAll("[data-command]").forEach((button) => {
    button.addEventListener("click", () => {
      const command = button.getAttribute("data-command");
      if (!command) return;
      commandHistory.push(command);
      historyIndex = commandHistory.length;
      runCommand(command);
      input.focus({ preventScroll: true });
    });
  });

  musicToggle.addEventListener("click", () => {
    if (audio.paused) void playMusic();
    else pauseMusic();
  });

  audio.addEventListener("play", () => setMusicState(true));
  audio.addEventListener("pause", () => setMusicState(false));
  audio.addEventListener("error", () => setMusicState(false));
})();
