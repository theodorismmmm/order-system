const supabaseUrl = "https://utuuqkpgkrlqmuezqfqp.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0dXVxa3Bna3JscW11ZXpxZnFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzA5ODIsImV4cCI6MjA4ODA0Njk4Mn0.-7oIwoVXSQ-NH7FEATo5jkLKUiu2SUqWdZQ_GGDS1Q4"

const supabaseClient = window.supabase?.createClient(supabaseUrl, supabaseKey) || null

function ensureSupabase(forPublic = false) {
  if (supabaseClient) return true
  const message = "Unable to load Supabase client. Please refresh and ensure the CDN is accessible."
  if (forPublic) {
    const resultDiv = document.getElementById("result")
    if (resultDiv) resultDiv.innerHTML = `<div class="notice notice-error">${escapeHtml(message)}</div>`
  } else {
    setNotice(message, "error")
  }
  return false
}

function escapeHtml(text = "") {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }
  return String(text ?? "").replace(/[&<>"']/g, m => map[m])
}

function setNotice(message, tone = "info") {
  const el = document.getElementById("adminMessage")
  if (!el) return

  const toneClass =
    {
      success: "notice-success",
      error: "notice-error",
      info: "notice-info",
      muted: "notice-muted"
    }[tone] || "notice-info"

  if (!message) {
    el.className = "notice notice-muted hidden"
    el.textContent = ""
    return
  }

  el.className = `notice ${toneClass}`
  el.textContent = message
}

// =======================
// PUBLIC TRACKING
// =======================

async function trackOrder() {
  const orderId = document.getElementById("orderInput")?.value.trim()
  const resultDiv = document.getElementById("result")
  resultDiv.innerHTML = ""

  if (!orderId) {
    resultDiv.innerHTML = `<div class="notice notice-error">Please enter an order ID.</div>`
    return
  }

  resultDiv.innerHTML = `<div class="result-card">Loading order...</div>`

  if (!ensureSupabase(true)) return

  const { data: steps } = await supabaseClient
    .from("order_steps")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at")

  const { data: notes } = await supabaseClient
    .from("order_notes")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at")

  if (!steps || steps.length === 0) {
    resultDiv.innerHTML = `<div class="notice notice-info">Order not found.</div>`
    return
  }

  const stepsList = steps
    .map(
      step => `
        <div class="step-row">
          <span class="status-chip ${step.completed ? "complete" : ""}">
            ${step.completed ? "Done" : "Open"}
          </span>
          <span>${escapeHtml(step.step_name)}</span>
        </div>
      `
    )
    .join("")

  const notesList =
    notes && notes.length > 0
      ? notes
          .map(
            note => `
              <div class="note-card">
                <p>${escapeHtml(note.note)}</p>
              </div>
            `
          )
          .join("")
      : `<p class="muted small">No notes yet for this order.</p>`

  resultDiv.innerHTML = `
    <div class="result-card stack">
      <div>
        <p class="eyebrow">Order</p>
        <h2>${escapeHtml(orderId)}</h2>
      </div>
      <div class="stack">
        <p class="eyebrow">Steps</p>
        ${stepsList}
      </div>
      <div class="stack">
        <p class="eyebrow">Notes</p>
        ${notesList}
      </div>
    </div>
  `
}

// =======================
// ADMIN
// =======================

async function login() {
  const email = document.getElementById("loginEmail")?.value.trim() || prompt("Email")
  const password = document.getElementById("loginPassword")?.value || prompt("Password")

  if (!email || !password) {
    setNotice("Email and password are required.", "error")
    return
  }

  setNotice("Signing in...", "info")

  if (!ensureSupabase()) return

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    setNotice(error.message, "error")
    return
  }

  setNotice("Logged in successfully.", "success")
}

async function createOrder() {
  const orderId = document.getElementById("newOrderId")?.value.trim()

  if (!orderId) {
    setNotice("Order ID is required.", "error")
    return
  }

  if (!ensureSupabase()) return

  const { error } = await supabaseClient.from("orders").insert({
    order_id: orderId
  })

  if (error) {
    setNotice(error.message, "error")
    return
  }

  setNotice("Order created.", "success")
}

async function addStep() {
  const orderId = document.getElementById("stepOrderId")?.value.trim()
  const stepName = document.getElementById("stepName")?.value.trim()

  if (!orderId || !stepName) {
    setNotice("Order ID and step name are required.", "error")
    return
  }

  if (!ensureSupabase()) return

  const { error } = await supabaseClient.from("order_steps").insert({
    order_id: orderId,
    step_name: stepName
  })

  if (error) {
    setNotice(error.message, "error")
    return
  }

  setNotice("Step added.", "success")
}

async function loadSteps() {
  const orderId = document.getElementById("toggleOrderId")?.value.trim()
  const stepsDiv = document.getElementById("steps")

  stepsDiv.innerHTML = `<p class="muted small">Loading steps...</p>`

  if (!orderId) {
    setNotice("Enter an order ID to load steps.", "error")
    stepsDiv.innerHTML = `<p class="notice notice-error">Order ID required.</p>`
    return
  }

  if (!ensureSupabase()) return

  const { data: steps, error } = await supabaseClient
    .from("order_steps")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at")

  if (error) {
    setNotice(error.message, "error")
    stepsDiv.innerHTML = `<p class="notice notice-error">${escapeHtml(error.message)}</p>`
    return
  }

  if (!steps || steps.length === 0) {
    stepsDiv.innerHTML = `<p class="muted small">No steps for this order yet.</p>`
    return
  }

  stepsDiv.innerHTML = steps
    .map(
      step => `
        <label class="step-row">
          <input type="checkbox" ${step.completed ? "checked" : ""} onchange="toggleStep(${JSON.stringify(step.id)}, this.checked)">
          <div>
            <strong>${escapeHtml(step.step_name)}</strong>
            <div class="muted small">${step.completed ? "Completed" : "Pending"}</div>
          </div>
        </label>
      `
    )
    .join("")
}

async function toggleStep(id, nextState) {
  if (!ensureSupabase()) return

  const { error } = await supabaseClient
    .from("order_steps")
    .update({ completed: nextState })
    .eq("id", id)

  if (error) {
    setNotice(error.message, "error")
    return
  }

  setNotice("Step updated.", "success")
  loadSteps()
}

async function addNote() {
  const orderId = document.getElementById("noteOrderId")?.value.trim()
  const noteText = document.getElementById("noteText")?.value.trim()

  if (!orderId || !noteText) {
    setNotice("Order ID and note are required.", "error")
    return
  }

  if (!ensureSupabase()) return

  const { error } = await supabaseClient.from("order_notes").insert({
    order_id: orderId,
    note: noteText
  })

  if (error) {
    setNotice(error.message, "error")
    return
  }

  setNotice("Note added.", "success")
}
