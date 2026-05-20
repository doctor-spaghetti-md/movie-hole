
const DATA_URL = "data/movies.json";
const ADMIN_CODE_FALLBACK = "MOVIEHOLE";

let movies = [];
let currentRandomMovie = null;

function normalizeTitle(title){
  return String(title || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

function escapeHtml(value){
  return String(value || "").replace(/[&<>"']/g, char => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[char]));
}

async function loadMovies(){
  try{
    const response = await fetch(DATA_URL, {cache:"no-store"});
    if(!response.ok) throw new Error("Could not load movie data.");
    movies = await response.json();
  }catch(error){
    movies = [];
    console.error(error);
  }
}

function formatDate(value){
  if(!value) return "";
  try{
    return new Date(value).toLocaleDateString(undefined, {
      year:"numeric",
      month:"short",
      day:"numeric"
    });
  }catch{
    return "";
  }
}

function renderMovieList(targetId, statusId, options = {}){
  const target = document.getElementById(targetId);
  const status = document.getElementById(statusId);
  if(!target) return;

  const searchTerm = normalizeTitle(options.search || "");
  const source = movies.filter(movie => {
    const selectedMatch = options.onlyEligible ? !movie.selected : true;
    const searchMatch = searchTerm
      ? normalizeTitle(movie.title).includes(searchTerm)
      : true;
    return selectedMatch && searchMatch;
  });

  target.innerHTML = "";

  if(status){
    status.textContent = source.length
      ? `${source.length} movie${source.length === 1 ? "" : "s"} on file.`
      : "No movies found.";
  }

  source.forEach(movie => {
    const card = document.createElement("article");
    card.className = "movie-card";
    card.innerHTML = `
      <div class="movie-title-row">
        <div class="movie-name">${escapeHtml(movie.title)}</div>
        <div class="movie-state">${movie.selected ? "Selected" : "Eligible"}</div>
      </div>
      <div class="movie-meta">${movie.submittedBy ? `Suggested by ${escapeHtml(movie.submittedBy)}` : "Suggested movie"}${movie.addedAt ? ` · ${formatDate(movie.addedAt)}` : ""}</div>
    `;
    target.appendChild(card);
  });
}

function setFormMessage(message, type = ""){
  const el = document.getElementById("formMessage");
  if(!el) return;
  el.textContent = message;
  el.className = `form-message ${type}`;
}

function showSubmitDialog(){
  const dialog = document.getElementById("submitDialog");
  if(dialog?.showModal){
    dialog.showModal();
  }else{
    alert("Movie submitted. It may take a minute before it appears on the Suggestions page.");
  }
}

async function submitMovie(event){
  event.preventDefault();

  const titleInput = document.getElementById("movieTitle");
  const nameInput = document.getElementById("submitterName");

  const title = titleInput.value.trim();
  const submittedBy = nameInput ? nameInput.value.trim() : "";

  if(!title){
    setFormMessage("Please enter a movie title.", "error");
    return;
  }

  const duplicate = movies.some(movie => normalizeTitle(movie.title) === normalizeTitle(title));
  if(duplicate){
    setFormMessage('please stop asking for movies we already have on file, you dick. Or you will be removed from this site and reported to the police', "error");
    return;
  }

  setFormMessage("Submitting...", "");

  try{
    const response = await fetch("/.netlify/functions/add-movie", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({title, submittedBy})
    });

    const result = await response.json().catch(() => ({}));

    if(!response.ok){
      throw new Error(result.error || "Movie could not be submitted.");
    }

    titleInput.value = "";
    if(nameInput) nameInput.value = "";

    setFormMessage("Submitted. It may take a minute before it appears on the Suggestions page.", "success");
    showSubmitDialog();

  }catch(error){
    setFormMessage(error.message || "Movie could not be submitted.", "error");
  }
}

function selectRandomMovie(){
  const eligible = movies.filter(movie => !movie.selected);
  const result = document.getElementById("randomResult");
  const markButton = document.getElementById("markSelectedButton");

  if(!eligible.length){
    currentRandomMovie = null;
    result.textContent = "No eligible movies remain.";
    markButton?.classList.add("hidden");
    return;
  }

  currentRandomMovie = eligible[Math.floor(Math.random() * eligible.length)];
  result.textContent = currentRandomMovie.title;
  markButton?.classList.remove("hidden");
}

function openAdminDialog(){
  const dialog = document.getElementById("adminDialog");
  const message = document.getElementById("adminMessage");
  const input = document.getElementById("adminCodeInput");
  if(message) message.textContent = "";
  if(input) input.value = "";
  if(dialog?.showModal) dialog.showModal();
}

async function confirmMarkSelected(event){
  event.preventDefault();
  if(!currentRandomMovie) return;

  const dialog = document.getElementById("adminDialog");
  const input = document.getElementById("adminCodeInput");
  const message = document.getElementById("adminMessage");
  const code = input?.value || "";

  if(!code.trim()){
    message.textContent = "Enter the admin code.";
    message.className = "form-message error";
    return;
  }

  try{
    const response = await fetch("/.netlify/functions/mark-selected", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({id:currentRandomMovie.id, code})
    });

    const result = await response.json().catch(() => ({}));
    if(!response.ok) throw new Error(result.error || "Incorrect code.");

    const found = movies.find(movie => movie.id === currentRandomMovie.id);
    if(found) found.selected = true;

    dialog.close();
    document.getElementById("randomResult").textContent = `${currentRandomMovie.title} marked as selected.`;
    document.getElementById("markSelectedButton")?.classList.add("hidden");
    renderMovieList("bingoList", "bingoStatus", {onlyEligible:true});
  }catch(error){
    // Fallback local admin code for preview only.
    if(code === ADMIN_CODE_FALLBACK){
      const found = movies.find(movie => movie.id === currentRandomMovie.id);
      if(found) found.selected = true;
      dialog.close();
      document.getElementById("randomResult").textContent = `${currentRandomMovie.title} marked as selected.`;
      document.getElementById("markSelectedButton")?.classList.add("hidden");
      renderMovieList("bingoList", "bingoStatus", {onlyEligible:true});
      return;
    }

    message.textContent = error.message || "Incorrect code.";
    message.className = "form-message error";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadMovies();

  const form = document.getElementById("suggestionForm");
  if(form) form.addEventListener("submit", submitMovie);

  document.getElementById("closeSubmitDialog")?.addEventListener("click", () => {
    document.getElementById("submitDialog")?.close();
  });

  const search = document.getElementById("suggestionSearch");
  if(search){
    renderMovieList("suggestionsList", "suggestionsStatus");
    search.addEventListener("input", () => {
      renderMovieList("suggestionsList", "suggestionsStatus", {search:search.value});
    });
  }

  if(document.getElementById("bingoList")){
    renderMovieList("bingoList", "bingoStatus", {onlyEligible:true});
  }

  document.getElementById("randomButton")?.addEventListener("click", selectRandomMovie);
  document.getElementById("markSelectedButton")?.addEventListener("click", openAdminDialog);
  document.getElementById("adminForm")?.addEventListener("submit", confirmMarkSelected);
});
